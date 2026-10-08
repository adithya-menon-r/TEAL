"""
gateway/teal_gateway/proxy.py
-----------------------------
Reverse proxy handler for aiohttp supporting HTTP streaming and bidirectional WebSockets.
Preserves the Host header as required by §8.2.
"""

import asyncio
import logging
from typing import Set
from aiohttp import ClientSession, ClientWebSocketResponse, WSMsgType, web

logger = logging.getLogger("teal.gateway.proxy")

HOP_BY_HOP_HEADERS: Set[str] = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}


async def forward_request(
    request: web.Request,
    upstream_url: str,
    session: ClientSession,
) -> web.StreamResponse:
    """
    Forward an HTTP or WebSocket request to the upstream target.
    """
    # Check if request is a WebSocket upgrade
    if request.headers.get("Upgrade", "").lower() == "websocket":
        return await _forward_websocket(request, upstream_url, session)

    return await _forward_http(request, upstream_url, session)


async def _forward_http(
    request: web.Request,
    target_url: str,
    session: ClientSession,
) -> web.StreamResponse:
    """Forward standard HTTP request and stream back the response."""
    # Build upstream headers
    headers = {}
    for k, v in request.headers.items():
        if k.lower() not in HOP_BY_HOP_HEADERS:
            headers[k] = v

    # Preserve Host header (§8.2)
    if "Host" in request.headers:
        headers["Host"] = request.headers["Host"]

    data = await request.read() if request.can_read_body else None

    try:
        async with session.request(
            method=request.method,
            url=target_url,
            headers=headers,
            params=request.query,
            data=data,
            allow_redirects=False,
        ) as upstream_resp:
            resp = web.StreamResponse(
                status=upstream_resp.status,
                reason=upstream_resp.reason,
            )

            # Copy response headers except hop-by-hop
            for k, v in upstream_resp.headers.items():
                if k.lower() not in HOP_BY_HOP_HEADERS and k.lower() != "content-length":
                    resp.headers[k] = v

            resp.content_length = upstream_resp.content_length
            await resp.prepare(request)

            async for chunk in upstream_resp.content.iter_chunked(65536):
                await resp.write(chunk)
            await resp.write_eof()
            return resp

    except Exception as e:
        logger.error("Error proxying HTTP request to %s: %s", target_url, e)
        return web.Response(
            status=502,
            text=f"Bad Gateway: Unable to reach upstream interface ({e})",
            content_type="text/plain",
        )


async def _forward_websocket(
    request: web.Request,
    target_url: str,
    session: ClientSession,
) -> web.WebSocketResponse:
    """Proxy WebSocket connection bidirectionally."""
    client_ws = web.WebSocketResponse()
    await client_ws.prepare(request)

    # Convert http(s) to ws(s) for target_url
    ws_target_url = target_url
    if ws_target_url.startswith("http://"):
        ws_target_url = "ws://" + ws_target_url[7:]
    elif ws_target_url.startswith("https://"):
        ws_target_url = "wss://" + ws_target_url[8:]

    headers = {}
    for k, v in request.headers.items():
        if k.lower() not in HOP_BY_HOP_HEADERS:
            headers[k] = v
    if "Host" in request.headers:
        headers["Host"] = request.headers["Host"]

    try:
        upstream_ws: ClientWebSocketResponse = await session.ws_connect(
            ws_target_url,
            headers=headers,
            params=request.query,
        )
    except Exception as e:
        logger.error("Failed to connect upstream WebSocket to %s: %s", ws_target_url, e)
        await client_ws.close(code=1011, message=b"Upstream connection failed")
        return client_ws

    async def client_to_upstream():
        try:
            async for msg in client_ws:
                if msg.type == WSMsgType.TEXT:
                    await upstream_ws.send_str(msg.data)
                elif msg.type == WSMsgType.BINARY:
                    await upstream_ws.send_bytes(msg.data)
                elif msg.type == WSMsgType.CLOSE:
                    await upstream_ws.close()
                    break
                elif msg.type == WSMsgType.ERROR:
                    logger.error("Client WS error: %s", client_ws.exception())
                    break
        except Exception as err:
            logger.debug("client_to_upstream loop exception: %s", err)
        finally:
            if not upstream_ws.closed:
                await upstream_ws.close()

    async def upstream_to_client():
        try:
            async for msg in upstream_ws:
                if msg.type == WSMsgType.TEXT:
                    await client_ws.send_str(msg.data)
                elif msg.type == WSMsgType.BINARY:
                    await client_ws.send_bytes(msg.data)
                elif msg.type == WSMsgType.CLOSE:
                    await client_ws.close()
                    break
                elif msg.type == WSMsgType.ERROR:
                    logger.error("Upstream WS error: %s", upstream_ws.exception())
                    break
        except Exception as err:
            logger.debug("upstream_to_client loop exception: %s", err)
        finally:
            if not client_ws.closed:
                await client_ws.close()

    try:
        await asyncio.gather(client_to_upstream(), upstream_to_client())
    except Exception as e:
        logger.debug("WebSocket bridge ended: %s", e)

    return client_ws

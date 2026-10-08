# templates/gateway.Dockerfile
# Stage 1: Build the lab-ui frontend
FROM oven/bun:1-alpine AS ui-builder
WORKDIR /build

COPY lab-ui/package.json lab-ui/bun.lock ./
RUN bun install --frozen-lockfile

COPY lab-ui/ ./
RUN bun run build

# Stage 2: Packaging scratch image containing teal-gateway code and built UI
FROM scratch
COPY gateway/teal_gateway/ /opt/teal-gateway/teal_gateway/
COPY gateway/requirements.txt /opt/teal-gateway/requirements.txt
COPY --from=ui-builder /build/dist/ /opt/teal-gateway/ui/

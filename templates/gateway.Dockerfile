# templates/gateway.Dockerfile
# Stage 1: Build the lab-ui frontend
FROM node:20-alpine AS ui-builder
WORKDIR /build

COPY lab-ui/package*.json ./
RUN npm ci || npm install

COPY lab-ui/ ./
RUN npm run build

# Stage 2: Packaging scratch image containing teal-gateway code and built UI
FROM scratch
COPY gateway/teal_gateway/ /opt/teal-gateway/teal_gateway/
COPY gateway/requirements.txt /opt/teal-gateway/requirements.txt
COPY --from=ui-builder /build/dist/ /opt/teal-gateway/ui/

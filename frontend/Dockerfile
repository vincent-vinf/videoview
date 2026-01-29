# Stage 1: Build the frontend
FROM docker.1ms.run/node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with Caddy
FROM docker.1ms.run/caddy:2-alpine
COPY --from=builder /app/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80

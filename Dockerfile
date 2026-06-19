# Multi-stage Dockerfile: build the frontend, then serve it + the realtime
# Socket.IO server from a single Node process / single port.

# --- Build stage: compile the Vite/React frontend ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Serve assets from the site root and let the client connect to the realtime
# server on the same origin (no separate VITE_ONLINE_SERVER_URL needed).
ENV VITE_BASE_PATH=/
RUN npm run build

# --- Runtime stage: server + built frontend, production deps only ---
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY --from=build /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]

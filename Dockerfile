# Dockerfile for the Game Viet realtime (Socket.IO) server
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install production dependencies only (the server needs socket.io at runtime)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the server source
COPY server ./server

# The server listens on PORT (default 3000)
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Basic healthcheck against the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]

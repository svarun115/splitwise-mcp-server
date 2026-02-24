FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Install deps and build
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -sf http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js", "--http", "--port", "4000"]

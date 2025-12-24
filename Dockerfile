FROM node:20-bullseye-slim AS deps

# --- Build tools required for sqlite3 ---
RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# --- Runtime image ---
FROM node:20-bullseye-slim AS runner

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Runtime deps
RUN apt-get update && apt-get install -y \
  curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY package*.json ./
COPY index.js ./
COPY .sequelizerc ./
COPY src ./src
COPY config ./config
COPY database ./database
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh

# Required runtime folders
RUN mkdir -p logs uploads \
  && chown -R node:node /usr/src/app

USER node
EXPOSE 5000
CMD ["./scripts/docker-entrypoint.sh"]

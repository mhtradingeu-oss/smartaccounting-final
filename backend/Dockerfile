FROM node:20-bullseye-slim AS deps
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:20-bullseye-slim AS runner
ARG BUILD_COMMIT_SHA=unknown
ARG BUILD_TIMESTAMP=unknown
ARG BUILD_IMAGE_DIGEST=unknown
WORKDIR /usr/src/app
ENV NODE_ENV=production \
    BUILD_COMMIT_SHA=${BUILD_COMMIT_SHA} \
    BUILD_TIMESTAMP=${BUILD_TIMESTAMP} \
    BUILD_IMAGE_DIGEST=${BUILD_IMAGE_DIGEST}
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node index.js ./
COPY --chown=node:node .sequelizerc ./
COPY --chown=node:node src ./src
COPY --chown=node:node config ./config
COPY --chown=node:node database ./database
RUN mkdir -p uploads \
  && chown node:node uploads
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*
USER node
EXPOSE 5000
CMD ["node", "index.js"]

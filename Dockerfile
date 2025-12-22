# Multi-stage Dockerfile tuned for production readiness

# --- Frontend Build Stage ---
FROM node:20-alpine AS frontend-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- Backend Dependency Layer ---
FROM node:20-alpine AS backend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . ./
RUN find ./client -mindepth 1 -maxdepth 1 \! -name appVersion.json -exec rm -rf {} +

# --- Production Runtime Image ---
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=backend-build /app /app
COPY --from=frontend-build /app/client/dist ./client/dist
RUN chown -R node:node /app
USER node
EXPOSE 5000
CMD ["node", "index.js"]

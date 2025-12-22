FROM node:20-bullseye-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL:-/api}
RUN npm run build

FROM nginx:1.25-alpine AS runner
ARG BACKEND_HOST=backend
ARG BACKEND_PORT=5000
ENV BACKEND_HOST=${BACKEND_HOST}
ENV BACKEND_PORT=${BACKEND_PORT}
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN apk add --no-cache curl
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

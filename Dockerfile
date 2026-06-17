FROM node:20-bullseye-slim

WORKDIR /usr/src/app

# Default environment (can be overridden by docker-compose)
ENV NODE_ENV=development

# =====================
# SYSTEM DEPENDENCIES
# =====================
RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  curl \
  && rm -rf /var/lib/apt/lists/*

# =====================
# INSTALL DEPENDENCIES
# =====================
COPY package.json package-lock.json ./
RUN npm ci

# =====================
# SOURCE CODE
# =====================
COPY index.js ./
COPY .sequelizerc ./
COPY src ./src
COPY config ./config
COPY database ./database
COPY scripts ./scripts
COPY shared ./shared
COPY docs ./docs

# =====================
# RUNTIME DIRECTORIES
# =====================
RUN mkdir -p logs uploads temp

# =====================
# PORT
# =====================
EXPOSE 5000

# =====================
# START COMMAND
# =====================
CMD ["node", "index.js"]
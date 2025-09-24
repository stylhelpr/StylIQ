# ---------- build ----------
# FROM node:20-alpine AS build
FROM node:20-alpine@sha256:dcfbf9f701b58c1d4c70a320ff12a74c0e0c5efc0a7e3fd5f6d26889dc0d6dbe AS build

WORKDIR /app
RUN apk add --no-cache python3 make g++  # needed for node-gyp deps

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- runtime ----------
# FROM node:20-alpine AS runtime
FROM node:20-alpine@sha256:dcfbf9f701b58c1d4c70a320ff12a74c0e0c5efc0a7e3fd5f6d26889dc0d6dbe AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080

RUN apk add --no-cache dumb-init curl ca-certificates

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# Start NestJS
CMD ["dumb-init", "node", "dist/main.js"]
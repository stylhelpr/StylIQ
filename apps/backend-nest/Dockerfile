# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++  # needed for node-gyp deps

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080

RUN apk add --no-cache dumb-init curl ca-certificates

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# Start NestJS
CMD ["dumb-init", "node", "dist/main.js"]


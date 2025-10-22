# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++  # needed for node-gyp deps

# Copy backend package files
COPY apps/backend-nest/package*.json ./
RUN npm ci

# Copy backend source code
COPY apps/backend-nest ./

RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080

RUN apk add --no-cache dumb-init curl ca-certificates

# Copy backend package files (ensure both JSON files are present)
COPY apps/backend-nest/package.json apps/backend-nest/package-lock.json ./
RUN ls -la && npm ci --omit=dev

# Copy built dist folder from build stage
COPY --from=build /app/dist ./dist

# Start NestJS
CMD ["dumb-init", "node", "dist/main.js"]

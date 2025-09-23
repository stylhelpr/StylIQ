# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app

# Ensure npm can use full CA bundle on alpine
RUN apk add --no-cache ca-certificates

# Copy only manifests first (better cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080

# System certs (https calls) + optional tiny init + curl for healthcheck
RUN apk add --no-cache ca-certificates dumb-init curl

# Copy only what's needed
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# EXPOSE is documentation only; Cloud Run uses $PORT
EXPOSE 8080

# Run as non-root for security (remove if secrets mount fails with EACCES)
USER node

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

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

# 🔑 Ensure secrets are symlinked to the expected filename
# Cloud Run mounts FIREBASE_ADMIN_SA as /secrets/firebase.json
# Your code expects /app/stylhelpr-prod-85685-7ca9f2f2ded8.json
RUN mkdir -p /secrets \
  && ln -s /secrets/firebase.json /app/stylhelpr-prod-85685-7ca9f2f2ded8.json

# (Optional) If you read .env in production, copy it via secrets instead.
# EXPOSE is only documentation; Cloud Run uses $PORT.
EXPOSE 8080

# Run as non-root for security
USER node

# Optional: simple healthcheck against your Nest prefix
# HEALTHCHECK --interval=30s --timeout=3s \
#   CMD curl -f http://127.0.0.1:${PORT}/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

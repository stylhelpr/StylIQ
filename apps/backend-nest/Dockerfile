# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
# Copy only backend manifests first to leverage cache
COPY package*.json ./
# Use lockfile if present, otherwise fallback to install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
# Now copy the rest of the backend code
COPY . .
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/main.js"]

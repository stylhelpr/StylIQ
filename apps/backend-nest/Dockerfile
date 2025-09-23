# ---- deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Be robust to presence/absence of package-lock.json
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# ---- build
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
# Install dev deps for build if needed (again robust to lockfile)
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
RUN npm run build

# ---- runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
# bring prod deps and compiled app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/main.js"]

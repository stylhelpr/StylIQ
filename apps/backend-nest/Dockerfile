# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
# Faster installs + reproducible cache
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Compile Nest to dist
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Only prod deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
# App files
COPY --from=build /app/dist ./dist
# If you have any non-TS runtime assets (e.g., email templates), copy them too:
# COPY --from=build /app/src/**/*.hbs ./dist/
# Health + listen
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/main.js"]

# Orbital Frontend - Multi-Stage: Vite/React-Build -> nginx
# Sprint B: React + TypeScript + three.js (vorher: statisches Vanilla-JS)

FROM node:22-alpine AS build
WORKDIR /app

# Nur Manifeste zuerst: npm-Layer bleibt gecacht, solange sich die Deps nicht ändern.
# package-lock.json ist Pflicht (reproduzierbare Builds) — ohne Lockfile bricht
# der Build hier bewusst, statt still auf npm install zurückzufallen.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# Unprivilegiertes nginx: läuft als User nginx (UID 101), lauscht auf 8080
# statt 80 — kein root im Container nötig.
FROM nginxinc/nginx-unprivileged:alpine

LABEL maintainer="IQI Hub Orbital Simulator"
LABEL version="2.0.0"

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nur das Build-Ergebnis + Fehlerseite — kein Source mehr im Image
COPY --from=build /app/dist /usr/share/nginx/html
COPY 50x.html /usr/share/nginx/html/50x.html

# Expose port (unprivilegiert)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

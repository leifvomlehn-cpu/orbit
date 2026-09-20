# Orbital Frontend - Multi-Stage: Vite/React-Build -> nginx
# Sprint B: React + TypeScript + three.js (vorher: statisches Vanilla-JS)

FROM node:22-alpine AS build
WORKDIR /app

# Nur Manifeste zuerst: npm-Layer bleibt gecacht, solange sich die Deps nicht ändern.
# Fallback npm install, solange noch kein package-lock.json committed ist.
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

COPY . .
RUN npm run build

FROM nginx:alpine

LABEL maintainer="IQI Hub Orbital Simulator"
LABEL version="2.0.0"

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nur das Build-Ergebnis + Fehlerseite — kein Source mehr im Image
COPY --from=build /app/dist /usr/share/nginx/html
COPY 50x.html /usr/share/nginx/html/50x.html

# Set proper permissions
RUN chmod -R 755 /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

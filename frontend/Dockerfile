# Orbital Frontend - Nginx Alpine
# Serves static HTML5 Canvas application

FROM nginx:alpine

LABEL maintainer="IQI Hub Orbital Simulator"
LABEL version="1.0.0"

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy frontend files
COPY . /usr/share/nginx/html

# Set proper permissions
RUN chmod -R 755 /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

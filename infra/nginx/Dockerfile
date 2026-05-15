# Multi-stage build: Frontend + Nginx Reverse Proxy
# ===================================================

# Stage 1: Frontend Builder
FROM node:20-alpine as frontend-builder

LABEL stage=frontend-builder

WORKDIR /build

# Copy package files
COPY apps/frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY apps/frontend .

# Build application
RUN npm run build

# Stage 2: Nginx Runtime
FROM nginx:alpine

LABEL maintainer="DevOps Team"
LABEL description="ECOTEL - Reverse Proxy, Web Server, Load Balancer"
LABEL version="1.0.0"

# Install additional tools
RUN apk add --no-cache \
    curl \
    wget \
    tzdata \
    logrotate

# Set timezone
ENV TZ=Asia/Ho_Chi_Minh

# Create nginx user/directories
RUN mkdir -p /var/log/nginx \
    && mkdir -p /var/cache/nginx \
    && mkdir -p /etc/nginx/conf.d \
    && mkdir -p /etc/nginx/ssl

# Copy Nginx configuration files
# Main configuration
COPY infra/nginx/nginx.conf /etc/nginx/nginx.conf

# Configuration modules
COPY infra/nginx/conf.d/upstream.conf /etc/nginx/conf.d/upstream.conf
COPY infra/nginx/conf.d/gzip.conf /etc/nginx/conf.d/gzip.conf
COPY infra/nginx/conf.d/security.conf /etc/nginx/conf.d/security.conf
COPY infra/nginx/conf.d/ratelimit.conf /etc/nginx/conf.d/ratelimit.conf
COPY infra/nginx/conf.d/caching.conf /etc/nginx/conf.d/caching.conf
COPY infra/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

# Copy SSL certificates (if available)
COPY infra/nginx/ssl/* /etc/nginx/ssl/ 2>/dev/null || true

# Copy built frontend from builder stage
COPY --from=frontend-builder /build/dist /usr/share/nginx/html

# Create default error pages
RUN mkdir -p /usr/share/nginx/html && \
    echo '<!DOCTYPE html><html><body><h1>404 Not Found</h1></body></html>' \
    > /usr/share/nginx/html/404.html && \
    echo '<!DOCTYPE html><html><body><h1>500 Server Error</h1></body></html>' \
    > /usr/share/nginx/html/50x.html

# Fix permissions
RUN chown -R nginx:nginx /var/log/nginx /var/cache/nginx /usr/share/nginx/html && \
    chmod -R 755 /var/log/nginx /var/cache/nginx

# Remove default config
RUN rm -f /etc/nginx/conf.d/default.conf.bak

# Verify nginx configuration
RUN nginx -t

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

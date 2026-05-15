# Multi-stage build for frontend
# Stage 1: Builder
FROM node:20-alpine as builder

LABEL stage=builder

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

# Stage 2: Runtime
FROM nginx:alpine

LABEL maintainer="DevOps Team"
LABEL description="ECOTEL Frontend Application - React + Vite"
LABEL version="1.0.0"

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user (nginx already has www-data)
# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY infra/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

# Copy SSL certificates (if available)
RUN mkdir -p /etc/nginx/ssl
COPY infra/nginx/ssl/* /etc/nginx/ssl/ 2>/dev/null || true

# Copy built application from builder stage
COPY --from=builder /build/dist /usr/share/nginx/html

# Create directory for nginx logs
RUN mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /var/log/nginx /usr/share/nginx/html

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

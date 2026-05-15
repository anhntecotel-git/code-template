# ECOTEL Nginx Configuration

Nginx acting as **Reverse Proxy**, **Web Server**, and **Load Balancer** for ECOTEL application.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          NGINX (Port 80)                        │
│                    Reverse Proxy + Load Balancer                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐      ┌──────────────────────┐        │
│  │  Static Assets (1y)  │      │  API Reverse Proxy   │        │
│  │  /dist/* (*.js/css)  │      │  /api/* → Backend    │        │
│  │  Caching: immutable  │      │  Rate Limit: 100/min │        │
│  └──────────────────────┘      └──────────────────────┘        │
│          ↓                              ↓                       │
│  ┌──────────────────────┐      ┌──────────────────────┐        │
│  │  Frontend React App  │      │  Backend Java API    │        │
│  │  SPA Routing         │      │  Load Balanced       │        │
│  │  index.html fallback │      │  Health Check        │        │
│  └──────────────────────┘      └──────────────────────┘        │
│          ↓                              ↓                       │
│                              ┌──────────────────────┐           │
│                              │  PostgreSQL Database │           │
│                              │  Redis Cache         │           │
│                              └──────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Directory Structure

```
infra/nginx/
├── nginx.conf                    # Main Nginx configuration
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.snippet.yml    # Docker Compose example
│
├── conf.d/
│   ├── upstream.conf            # Backend service definitions
│   ├── gzip.conf                # Compression settings
│   ├── security.conf            # Security headers
│   ├── ratelimit.conf           # Rate limiting zones
│   ├── caching.conf             # Cache configuration
│   └── default.conf             # Main server configuration
│
├── ssl/
│   ├── cert.pem                 # SSL certificate (to be added)
│   ├── key.pem                  # Private key (to be added)
│   └── dhparam.pem              # Diffie-Hellman params (to be generated)
│
└── logs/                         # Nginx logs directory
    ├── access.log
    ├── error.log
    ├── api_access.log
    └── frontend_access.log
```

## 🔧 Configuration Files

### 1. **nginx.conf** - Main Configuration
- Worker processes and connections
- Logging format (standard + JSON)
- Performance tuning (sendfile, tcp_nopush, keepalive)
- Module includes for modular configuration

### 2. **upstream.conf** - Load Balancing
**Multiple upstream definitions:**

#### Backend API (least_conn)
```nginx
upstream backend_api {
    least_conn;
    server backend:8080 weight=1 max_fails=3 fail_timeout=30s;
    server backend2:8080 weight=1 max_fails=3 fail_timeout=30s;
    server backend3:8080 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

**Load Balancing Methods:**
- `least_conn` - Least connections (recommended for APIs)
- `ip_hash` - Source IP based (session persistence)
- `hash` - Session ID based (session persistence)

### 3. **default.conf** - Main Server Configuration

#### ✅ Section 1: Frontend (Web Server)
```nginx
location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;  # SPA routing
    add_header Cache-Control "public, max-age=0, must-revalidate";
}
```

#### ✅ Section 2: Static Assets (Caching)
```nginx
location ~* \.(js|css|png|jpg|...) {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

#### ✅ Section 3: API Reverse Proxy
```nginx
location /api/ {
    limit_req zone=api_limit burst=10 nodelay;
    proxy_pass http://backend_api;
    
    # Headers preservation
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Caching
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
}
```

**Special Locations:**
- `/api/v1/auth/login` - No caching, higher rate limit
- `/api/v1/upload` - Rate limited to 1 req/sec
- `/api/v1/download` - Higher rate limit (20 req/sec)

### 4. **gzip.conf** - Compression
- Compression level: 6 (balance between speed & size)
- Enabled for: text, JavaScript, JSON, images, fonts
- Disabled for: IE6 and older

### 5. **security.conf** - Security Headers
```nginx
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'...
Referrer-Policy: strict-origin-when-cross-origin
```

### 6. **ratelimit.conf** - Rate Limiting
**Rate limit zones:**
- `general_limit` - 10 req/sec
- `api_limit` - 100 req/min
- `login_limit` - 5 req/min
- `upload_limit` - 1 req/sec
- `download_limit` - 20 req/sec

### 7. **caching.conf** - Caching Strategy
```nginx
proxy_cache_path /var/cache/nginx/api_cache
    levels=1:2
    keys_zone=api_cache:10m
    max_size=500m
    inactive=30m;
```

**Cache Zones:**
- `http_cache` - General HTTP cache (1GB, 60m inactive)
- `api_cache` - API responses (500MB, 30m inactive)
- `static_cache` - Static files (500MB, 30d inactive)

## 🚀 Usage

### 1. Build Nginx Docker Image
```bash
docker build -f infra/nginx/Dockerfile -t ecotel/nginx:latest .
```

### 2. Run with Docker Compose
```bash
# Use the provided snippet
docker-compose up -d nginx
```

### 3. Run with Kubernetes
```bash
# Configure in K8s Ingress
kubectl apply -f infra/k8s/ingress.yaml
```

## 📊 Monitoring & Logging

### Access Logs
```bash
# Standard access logs
tail -f logs/nginx/access.log

# JSON formatted logs (better for parsing)
tail -f logs/nginx/access.json.log

# API logs only
tail -f logs/nginx/api_access.log

# Frontend logs only
tail -f logs/nginx/frontend_access.log
```

### Nginx Status
```bash
# View Nginx internal status
curl http://localhost:80/nginx-status

# Output:
# Active connections: 2
# server accepts handled requests
#  100 100 200
# Reading: 0 Writing: 1 Waiting: 1
```

### Health Check
```bash
# Check Nginx health
curl http://localhost/health
# Response: healthy
```

### Metrics for Prometheus
```bash
# View backend health metrics
curl http://localhost/metrics
```

## 🔒 Security Configuration

### DDoS Protection
- Rate limiting per IP
- Connection limits
- Slow request timeout

### Headers Protection
- CSP (Content Security Policy)
- X-Frame-Options (Clickjacking)
- X-Content-Type-Options (MIME sniffing)

### Access Control
- Deny hidden files (/.*)
- Deny sensitive files (/.git, .env)
- Disable PHP execution

## 🛠️ SSL/TLS Configuration

### Generate Self-Signed Certificate
```bash
mkdir -p infra/nginx/ssl

# Generate private key
openssl genrsa -out infra/nginx/ssl/key.pem 2048

# Generate certificate
openssl req -new -x509 -key infra/nginx/ssl/key.pem \
    -out infra/nginx/ssl/cert.pem -days 365
```

### Generate Diffie-Hellman Parameters
```bash
openssl dhparam -out infra/nginx/ssl/dhparam.pem 2048
```

### Enable HTTPS
Uncomment HTTPS section in `conf.d/default.conf`:
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_dhparam /etc/nginx/ssl/dhparam.pem;
    ...
}

server {
    listen 80;
    return 301 https://$server_name$request_uri;
}
```

## ⚙️ Performance Tuning

### Worker Processes
```nginx
worker_processes auto;  # Auto-detect CPU count
```

### Worker Connections
```nginx
events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}
```

### Buffering
```nginx
proxy_buffer_size 4k;
proxy_buffers 8 4k;
proxy_busy_buffers_size 8k;
```

### Connection Pooling
```nginx
upstream backend_api {
    keepalive 32;  # Connection pooling
}
```

## 🐛 Troubleshooting

### Check Nginx Configuration
```bash
nginx -t
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
```

### View Active Connections
```bash
curl http://localhost/nginx-status
```

### Check Backend Health
```bash
# Get upstream status
upstream_health_check=$(curl -s http://backend:8080/actuator/health)
echo $upstream_health_check
```

### Performance Issues
1. **High latency**: Check proxy buffer settings
2. **Cache miss**: Check cache key configuration
3. **502 Bad Gateway**: Verify backend service health
4. **Rate limiting**: Adjust limit zones in ratelimit.conf

### Debug Logs
```bash
# Increase error log level temporarily
# Change in nginx.conf:
error_log /var/log/nginx/error.log debug;

# Reload nginx
nginx -s reload

# Check logs
tail -f logs/nginx/error.log
```

## 📈 Load Testing

### Test Backend Proxy
```bash
# Simple request
curl http://localhost/api/v1/employees

# With headers
curl -H "Authorization: Bearer token" \
     http://localhost/api/v1/employees

# Performance test (Apache Bench)
ab -n 1000 -c 10 http://localhost/api/v1/employees
```

### Monitor During Load
```bash
# Terminal 1: Watch logs
tail -f logs/nginx/api_access.log | grep -i "error"

# Terminal 2: Monitor connections
watch -n 1 'curl -s http://localhost/nginx-status'

# Terminal 3: Run load test
ab -n 10000 -c 100 http://localhost/api/v1/employees
```

## 🔄 Reload & Restart

### Graceful Reload (no downtime)
```bash
# Reload Nginx configuration
nginx -s reload

# Or with docker
docker-compose kill -s HUP nginx

# Or with kubectl
kubectl exec -n ecotel deployment/nginx -- nginx -s reload
```

### Restart
```bash
# Docker
docker-compose restart nginx

# Kubectl
kubectl rollout restart deployment/nginx -n ecotel
```

## 📝 Common Use Cases

### Use Case 1: Blue-Green Deployment
```nginx
# Switch between backend versions
upstream backend_api {
    server backend-blue:8080 weight=100;
    server backend-green:8080 weight=0;  # Inactive
}

# Swap weights to switch
upstream backend_api {
    server backend-blue:8080 weight=0;   # Inactive
    server backend-green:8080 weight=100; # Active
}
```

### Use Case 2: Canary Deployment
```nginx
upstream backend_api {
    server backend-stable:8080 weight=90;
    server backend-canary:8080 weight=10;
}
```

### Use Case 3: Maintenance Mode
```nginx
location / {
    return 503;
}

location = /maintenance.html {
    access_log off;
}

error_page 503 /maintenance.html;
```

## 📚 References

- [Nginx Official Documentation](https://nginx.org/en/docs/)
- [Nginx Reverse Proxy Guide](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Nginx Load Balancing](https://nginx.org/en/docs/http/load_balancing.html)
- [Nginx Caching](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)

---

**Last Updated**: 2024-05-13  
**Version**: 1.0.0  
**Status**: Production Ready

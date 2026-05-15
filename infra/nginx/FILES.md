# ECOTEL Nginx Configuration Files - Complete Reference

## 📦 Files Created

### Root Configuration Files

#### 1. **nginx.conf** (Main Master Configuration)
- **Purpose**: Master configuration file that ties everything together
- **Location**: `infra/nginx/nginx.conf`
- **Size**: ~150 lines
- **Key Sections**:
  - Worker processes and connections
  - Logging format definitions (standard + JSON)
  - Performance settings (sendfile, tcp_nopush)
  - Module includes for conf.d/
  - MIME types mapping

**Key Settings:**
```nginx
worker_processes auto;                    # Match CPU count
worker_connections 2048;                  # Max per worker
sendfile on;                              # Efficient file serving
tcp_nopush on;                            # Bundle headers
tcp_nodelay on;                           # Disable Nagle
keepalive_timeout 65s;                    # Connection reuse
```

#### 2. **Dockerfile** (Multi-Stage Build)
- **Purpose**: Build Nginx container with React frontend
- **Location**: `infra/nginx/Dockerfile`
- **Stages**: 2 (Frontend builder + Nginx runtime)
- **Base Image**: `nginx:alpine`
- **Final Size**: ~100MB

**Build Process:**
```
Stage 1: node:20-alpine
  ├─ Install dependencies (npm ci)
  ├─ Copy source (apps/frontend)
  └─ Build (npm run build → dist/)

Stage 2: nginx:alpine
  ├─ Copy nginx config files (6x)
  ├─ Copy frontend dist
  ├─ Create error pages
  ├─ Fix permissions
  ├─ Validate config (nginx -t)
  └─ Health check setup
```

---

### Configuration Modules (conf.d/)

#### 3. **conf.d/upstream.conf** (Backend Load Balancing)
- **Purpose**: Define backend service pool and load balancing
- **Size**: ~50 lines
- **Load Balancer Algorithm**: `least_conn` (connections-based)

**Upstream Definition:**
```nginx
upstream backend_api {
    least_conn;
    server backend:8080 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

**Supported Methods:**
- `least_conn` - Routes to backend with fewest active connections (recommended for APIs)
- `ip_hash` - Routes same IP to same backend (session persistence)
- `hash $cookie_sessionid` - Routes based on session cookie
- `round_robin` - Default, alternates between servers

**Features:**
- Health checks: Marks server down after 3 consecutive failures
- Failure timeout: 30 seconds before retrying
- Connection pooling: 32 keepalive connections for efficiency

#### 4. **conf.d/gzip.conf** (Compression)
- **Purpose**: Enable and configure gzip compression
- **Size**: ~20 lines
- **Compression Level**: 6 (balance: speed/compression ratio)

**Compressed Content Types:**
```
text/plain
text/css
text/xml
text/javascript
application/json
application/javascript
application/xml+rss
application/atom+xml
image/svg+xml
font/ttf
font/opentype
```

**Performance Impact:**
- Text: 80-90% reduction
- JSON: 85-90% reduction
- Images: Already compressed (skip)
- CSS/JS: 70-80% reduction

#### 5. **conf.d/security.conf** (Security Headers)
- **Purpose**: Add security headers to prevent attacks
- **Size**: ~30 lines
- **Headers Included**: 5 major + access denial rules

**Security Headers:**
```nginx
X-Content-Type-Options: nosniff           # Prevent MIME sniffing
X-Frame-Options: SAMEORIGIN               # Prevent clickjacking
X-XSS-Protection: 1; mode=block           # Enable browser XSS filter
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

**Access Denial:**
- Hidden files: `/.` → 404
- Git: `/.git` → 404
- Environment: `/.env` → 404
- PHP execution: `/*.php` → 404

#### 6. **conf.d/ratelimit.conf** (Rate Limiting)
- **Purpose**: Define rate limiting zones for DDoS/abuse prevention
- **Size**: ~20 lines
- **Zones**: 5 different rate limits

**Rate Limit Zones:**
```nginx
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=1r/s;
limit_req_zone $binary_remote_addr zone=download_limit:10m rate=20r/s;
```

**Zone Details:**
| Zone | Limit | Key Size | Shared Mem |
|------|-------|----------|-----------|
| general_limit | 10 req/sec | 10MB | Tracks 640K clients |
| api_limit | 100 req/min | 10MB | Tracks 640K clients |
| login_limit | 5 req/min | 10MB | Tracks 640K clients |
| upload_limit | 1 req/sec | 10MB | Tracks 640K clients |
| download_limit | 20 req/sec | 10MB | Tracks 640K clients |

#### 7. **conf.d/caching.conf** (Cache Configuration)
- **Purpose**: Configure proxy caching for performance
- **Size**: ~60 lines
- **Cache Paths**: 3 separate cache zones

**Cache Zones:**
```nginx
proxy_cache_path /var/cache/nginx/http_cache
    keys_zone=http_cache:10m max_size=1g inactive=60m;

proxy_cache_path /var/cache/nginx/api_cache
    keys_zone=api_cache:10m max_size=500m inactive=30m;

proxy_cache_path /var/cache/nginx/static_cache
    keys_zone=static_cache:10m max_size=500m inactive=30d;
```

**Cache Features:**
- `cache_lock` - Prevent thundering herd problem
- `proxy_cache_use_stale` - Serve stale while updating
- `proxy_cache_bypass` - Bypass cache on certain conditions
- `proxy_cache_background_update` - Update in background

#### 8. **conf.d/default.conf** (Main Server Configuration)
- **Purpose**: Main server block with all location definitions
- **Size**: ~350 lines
- **Sections**: 7 major sections with detailed routing

**Section 1: Frontend (SPA Routing)**
```nginx
location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
}
```
- Serves React app from /usr/share/nginx/html
- SPA routing: falls back to index.html for client-side routing

**Section 2: Static Assets (1-year caching)**
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|otf)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```
- Aggressive caching for fingerprinted assets
- Browser won't re-request unless URL changes

**Section 3: API Reverse Proxy**
```nginx
location /api/ {
    limit_req zone=api_limit burst=10 nodelay;
    proxy_pass http://backend_api;
    
    # Headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Caching
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
}
```
- Rate limited: 100 req/min with 10 burst
- Forwards all X-headers to backend
- Caches 200 responses for 5 minutes

**Section 3a: Special Locations**
```nginx
# Login: Stricter rate limit, no cache
location /api/v1/auth/login {
    limit_req zone=login_limit burst=2 nodelay;
    proxy_pass http://backend_api;
    proxy_cache off;
}

# Upload: Slow rate, no cache
location /api/v1/upload {
    limit_req zone=upload_limit burst=2 nodelay;
    proxy_pass http://backend_api;
    proxy_cache off;
}

# Download: Higher rate limit
location /api/v1/download {
    limit_req zone=download_limit burst=5 nodelay;
    proxy_pass http://backend_api;
}
```

**Section 4: Health Checks**
```nginx
location /health {
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}

location /nginx-status {
    stub_status on;
}

location /metrics {
    # Prometheus metrics (if module enabled)
}
```

**Section 5: Error Pages**
```nginx
error_page 404 /404.html;
error_page 500 502 503 504 /50x.html;
```

**Section 6: Security Denials**
```nginx
location ~ /\. { return 404; }           # Hidden files
location ~ /\.git { return 404; }         # Git directory
location ~ /\.env { return 404; }         # Environment file
location ~ \.php$ { return 404; }         # PHP files
```

**Section 7: Separate Logging**
```nginx
# API requests to separate log
location /api/ {
    access_log /var/log/nginx/api_access.log combined;
}

# Frontend to different log
location / {
    access_log /var/log/nginx/frontend_access.log combined;
}
```

---

### Docker Compose Integration

#### 9. **docker-compose.snippet.yml** (Docker Compose Example)
- **Purpose**: Example Docker Compose service definition
- **Location**: `infra/nginx/docker-compose.snippet.yml`
- **Usage**: Reference for docker-compose.yml

**Service Definition:**
```yaml
nginx:
  build:
    context: .
    dockerfile: infra/nginx/Dockerfile
  image: ecotel/nginx:latest
  container_name: nginx
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./infra/nginx/conf.d:/etc/nginx/conf.d:ro
    - ./apps/frontend/dist:/usr/share/nginx/html:ro
    - ./logs/nginx:/var/log/nginx
    - nginx-cache:/var/cache/nginx
  environment:
    - TZ=Asia/Ho_Chi_Minh
  depends_on:
    backend:
      condition: service_healthy
  networks:
    - app-network
  restart: unless-stopped
```

**Volumes:**
- `nginx.conf` - RO config
- `conf.d/` - RO module configs
- `dist/` - RO frontend build
- `logs/` - RW access/error logs
- `cache/` - RW proxy cache

---

## 📁 File Structure

```
infra/nginx/
├── README.md                          # Comprehensive documentation
├── QUICKREF.md                        # Quick reference guide
├── DEPLOYMENT.md                      # Integration guide
├── nginx.conf                         # Master configuration
├── Dockerfile                         # Multi-stage build
├── docker-compose.snippet.yml         # Docker Compose example
├── test-nginx.sh                      # Testing script
│
├── conf.d/
│   ├── upstream.conf                 # Backend load balancing
│   ├── gzip.conf                     # Compression
│   ├── security.conf                 # Security headers
│   ├── ratelimit.conf                # Rate limiting
│   ├── caching.conf                  # Cache configuration
│   └── default.conf                  # Main server config
│
├── ssl/
│   ├── cert.pem                      # SSL certificate
│   ├── key.pem                       # Private key
│   └── dhparam.pem                   # DH parameters
│
└── logs/
    ├── access.log                    # Standard access log
    ├── api_access.log                # API requests only
    ├── frontend_access.log           # Frontend requests only
    └── error.log                     # Nginx errors
```

---

## 🎯 Configuration Workflow

### 1. Building the Image

```bash
# Build from repository root
docker build -f infra/nginx/Dockerfile \
    -t ecotel/nginx:latest \
    -t ecotel/nginx:$(date +%Y%m%d) \
    .

# Tag for registry
docker tag ecotel/nginx:latest registry.example.com/ecotel/nginx:latest
docker push registry.example.com/ecotel/nginx:latest
```

### 2. Running with Docker Compose

```bash
# Start all services
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f nginx

# Reload configuration (no downtime)
docker-compose exec nginx nginx -s reload

# Stop
docker-compose down
```

### 3. Deploying to Kubernetes

```bash
# Prerequisites
kubectl create namespace ecotel

# Deploy with scripts
bash infra/scripts/deploy.sh

# Or manual deployment
kubectl apply -f infra/k8s/configmap.yaml -n ecotel
kubectl apply -f infra/k8s/secret.yaml -n ecotel
kubectl apply -f infra/k8s/service.yaml -n ecotel
kubectl apply -f infra/k8s/ingress.yaml -n ecotel

# Verify
kubectl get all -n ecotel
```

### 4. Configuration Updates

**During Development:**
```bash
# Update config file
vim infra/nginx/conf.d/default.conf

# Reload (no restart)
docker-compose exec nginx nginx -s reload
# OR
kubectl exec -n ecotel deployment/nginx -- nginx -s reload
```

**For Production:**
```bash
# Update config
vim infra/nginx/conf.d/default.conf

# Rebuild image
docker build -f infra/nginx/Dockerfile -t ecotel/nginx:v2 .

# Rolling deployment
kubectl set image deployment/nginx \
    nginx=ecotel/nginx:v2 -n ecotel \
    --record

# Monitor rollout
kubectl rollout status deployment/nginx -n ecotel
```

---

## ✅ Validation Checklist

Before deployment, verify:

- [ ] `nginx -t` returns "syntax is ok"
- [ ] All config files in `conf.d/` are present
- [ ] Frontend build exists in `apps/frontend/dist`
- [ ] Backend service is reachable (health check passes)
- [ ] SSL certificates in `ssl/` (if using HTTPS)
- [ ] Logs directory is writable
- [ ] Permissions: 644 for configs, 755 for directories
- [ ] Test endpoints:
  - [ ] GET / → 200 OK (frontend)
  - [ ] GET /api/v1/employees → 200/401 (backend)
  - [ ] GET /health → 200 (health check)
  - [ ] GET /nginx-status → Active connections

---

## 🔗 Related Files

- **Docker**: `apps/backend/Dockerfile`, `apps/frontend/Dockerfile`
- **Kubernetes**: `infra/k8s/configmap.yaml`, `infra/k8s/ingress.yaml`
- **Scripts**: `infra/scripts/deploy.sh`, `infra/scripts/start.sh`
- **Main**: `Architec.md`, `docker-compose.yml`, `Makefile`

---

**Last Updated**: 2024-05-13  
**Version**: 1.0.0  
**Status**: Production Ready ✅

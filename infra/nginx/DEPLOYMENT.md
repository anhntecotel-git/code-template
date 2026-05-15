# ECOTEL Nginx Deployment & Integration Guide

## 📦 Complete Infrastructure Stack

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ECOTEL Application Architecture                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     NGINX Layer (Port 80/443)                │  │
│  │         Reverse Proxy • Load Balancer • Web Server           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│      ▲            ▲              ▲            ▲                    │
│      │            │              │            │                    │
│  ┌───┴────┐  ┌───┴────┐  ┌──────┴────┐  ┌───┴────┐               │
│  │Frontend │  │Frontend │  │  Backend  │  │Backend │               │
│  │React #1 │  │React #2 │  │ Spring #1 │  │Spring  │  (3+ replicas)
│  │ :3000   │  │ :3001   │  │ :8080     │  │:8081   │               │
│  └─────────┘  └─────────┘  └───────────┘  └────────┘               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  Data Layer (K8s Cluster)                    │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │                                                              │  │
│  │  ┌────────────────────┐     ┌──────────────────────────┐   │  │
│  │  │  PostgreSQL DB     │     │  Redis Cache             │   │  │
│  │  │  ClusterIP:5432    │     │  ClusterIP:6379          │   │  │
│  │  │  Volume: 50Gi      │     │  Ephemeral               │   │  │
│  │  │  3-way replication │     │                          │   │  │
│  │  └────────────────────┘     └──────────────────────────┘   │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Kubernetes Namespace: ecotel
Pod networking: Service DNS enables auto-discovery
```

## 🚀 Deployment Methods

### Method 1: Docker Compose (Development)

```bash
# Build Nginx image
docker build -f infra/nginx/Dockerfile -t ecotel/nginx:latest .

# Start stack
cd infra/docker
docker-compose -f docker-compose.yml up -d

# Access
open http://localhost
```

**Components Started:**
- Nginx (port 80) → Frontend + API Proxy
- Frontend React (port 3000)
- Backend Java (port 8080)
- PostgreSQL (port 5432)
- Redis (port 6379)

### Method 2: Kubernetes (Production)

```bash
# Prerequisites
kubectl config use-context your-cluster

# Deploy complete stack
bash infra/scripts/deploy.sh

# Verify deployment
kubectl get all -n ecotel
kubectl get ingress -n ecotel

# Access via Ingress
open http://your-domain.com
```

**K8s Resources:**
- Namespace: `ecotel`
- Deployments: nginx, frontend, backend, postgres, redis
- Services: frontend, backend, postgres, redis (ClusterIP)
- Ingress: nginx-ingress (path-based routing)
- ConfigMaps: app-config, nginx-config
- Secrets: db-credentials, jwt-secret, tls-certs

## 📋 Configuration Layers

### Layer 1: Docker Configuration
File: `infra/docker/docker-compose.yml`

```yaml
nginx:
  image: ecotel/nginx:latest
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./infra/nginx/conf.d:/etc/nginx/conf.d:ro
    - ./apps/frontend/dist:/usr/share/nginx/html:ro
    - ./logs/nginx:/var/log/nginx
    - nginx-cache:/var/cache/nginx
  depends_on:
    backend:
      condition: service_healthy
  environment:
    - TZ=Asia/Ho_Chi_Minh
```

### Layer 2: Kubernetes Configuration
File: `infra/k8s/configmap.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
  namespace: ecotel
data:
  upstream.conf: |
    upstream backend_api {
      least_conn;
      server backend-service:8080;
    }
  default.conf: |
    server {
      listen 80;
      location / {
        try_files $uri $uri/ /index.html;
      }
      location /api/ {
        proxy_pass http://backend_api;
      }
    }
```

### Layer 3: Environment Variables
File: `infra/k8s/configmap.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: ecotel
data:
  FRONTEND_API_URL: "http://backend-service:8080"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  DB_HOST: "postgres-service"
  DB_PORT: "5432"
```

## 🔗 Integration Points

### 1. Frontend Integration

**Where Frontend is served:**
```nginx
# Dockerfile (Stage 2)
COPY --from=frontend-builder /build/dist /usr/share/nginx/html

# In conf.d/default.conf
location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
}
```

**How to update:**
```bash
# After frontend changes
cd apps/frontend
npm run build

# Rebuild Nginx image
docker build -f infra/nginx/Dockerfile -t ecotel/nginx:latest .

# Restart
docker-compose restart nginx
# OR
kubectl rollout restart deployment/nginx -n ecotel
```

### 2. Backend Integration

**How Nginx finds Backend:**
```nginx
# conf.d/upstream.conf
upstream backend_api {
    server backend-service:8080;  # K8s Service DNS
    # OR
    server backend:8080;          # Docker network
}

# conf.d/default.conf
location /api/ {
    proxy_pass http://backend_api;
}
```

**Adding Backend Instances (Scaling):**
```bash
# Docker Compose
docker-compose up -d --scale backend=3

# Kubernetes
kubectl scale deployment/backend --replicas=3 -n ecotel
```

### 3. Database Integration

**PostgreSQL Connection (from Backend):**
```
Backend → DB_HOST: postgres-service (K8s) or postgres (Docker)
         DB_PORT: 5432
         DB_NAME: ecotel
         DB_USER: postgres
         DB_PASSWORD: (from Secret)
```

**Redis Integration (Caching):**
```
Backend → REDIS_HOST: redis-service (K8s) or redis (Docker)
         REDIS_PORT: 6379
```

## 🔄 Request Lifecycle

### Example: GET /api/v1/employees

```
1. Client sends HTTP request
   GET /api/v1/employees HTTP/1.1
   Host: example.com

2. Nginx receives request at port 80

3. Nginx matches location: /api/
   - Applies rate limiting (zone: api_limit)
   - Checks cache (api_cache key: $scheme$method$host$uri)
   
4. If cached, return cached response with:
   X-Cache-Status: HIT
   
5. If not cached, forward to backend:
   - Select backend using least_conn algorithm
   - Add headers:
     X-Real-IP: client_ip
     X-Forwarded-For: client_ip
     X-Forwarded-Proto: http
     X-Forwarded-Host: example.com
   
6. Backend receives request at /api/v1/employees
   - Authenticates user
   - Queries PostgreSQL
   - Returns JSON response
   
7. Nginx receives backend response:
   - Caches with TTL: 5 minutes
   - Adds header: X-Cache-Status: MISS
   - Compresses with gzip (if supported)
   
8. Client receives final response:
   HTTP/1.1 200 OK
   Content-Encoding: gzip
   Cache-Control: max-age=300
   X-Cache-Status: MISS
   [compressed JSON body]
```

## 📊 Monitoring Integration

### Prometheus Metrics

**Nginx exports metrics at:**
```
http://localhost/metrics  (requires metrics module)
```

**Key Metrics:**
- `nginx_connections_active` - Active connections
- `nginx_http_requests_total` - Total requests
- `nginx_http_request_duration_seconds` - Request latency
- `nginx_http_response_size_bytes` - Response sizes

### Access Logs

**Standard JSON format:**
```json
{
  "timestamp": "2024-05-13T10:30:45+07:00",
  "remote_addr": "192.168.1.100",
  "request": "GET /api/v1/employees HTTP/1.1",
  "status": 200,
  "bytes_sent": 2048,
  "request_time": 0.045,
  "cache_status": "MISS"
}
```

**Log parsing with ELK Stack:**
```bash
# View in Elasticsearch
curl http://elasticsearch:9200/nginx-*/_search

# Dashboard in Kibana
open http://kibana:5601
```

## 🛡️ Security Configuration

### HTTPS/TLS Setup

```bash
# 1. Generate certificates
openssl genrsa -out infra/nginx/ssl/key.pem 2048
openssl req -new -x509 -key infra/nginx/ssl/key.pem \
    -out infra/nginx/ssl/cert.pem -days 365

# 2. Generate Diffie-Hellman parameters
openssl dhparam -out infra/nginx/ssl/dhparam.pem 2048

# 3. Update conf.d/default.conf (uncomment HTTPS section)

# 4. Rebuild and restart
docker build -f infra/nginx/Dockerfile -t ecotel/nginx:latest .
docker-compose restart nginx
```

### WAF (Web Application Firewall)

For ModSecurity integration:
```dockerfile
FROM nginx:latest
RUN apt-get install -y nginx-module-naxsi

# Add ModSecurity rules to conf.d/security.conf
```

## ⚡ Performance Tuning

### Memory Usage

```nginx
# In nginx.conf
# Default: 4k
proxy_buffer_size 8k;
proxy_buffers 8 8k;
proxy_busy_buffers_size 16k;

# Increase for large responses (API)
proxy_buffer_size 16k;
proxy_buffers 16 16k;
```

### Connection Pooling

```nginx
# In conf.d/upstream.conf
upstream backend_api {
    server backend:8080;
    keepalive 64;  # Increase from 32
    keepalive_timeout 60s;
}
```

### Cache Optimization

```nginx
# In conf.d/caching.conf
proxy_cache_path /var/cache/nginx/api_cache
    levels=1:2
    keys_zone=api_cache:10m
    max_size=1g
    inactive=60m
    use_temp_path=off;  # Faster on SSDs
```

## 📈 Scaling Strategy

### Horizontal Scaling (Add Instances)

**Frontend:**
```bash
kubectl scale deployment/frontend --replicas=5 -n ecotel
```

**Backend:**
```bash
kubectl scale deployment/backend --replicas=10 -n ecotel
```

**Nginx:** (Usually 1-2 instances)
```bash
kubectl scale deployment/nginx --replicas=2 -n ecotel
```

### Vertical Scaling (Increase Resources)

```yaml
# In infra/k8s/backend-deployment.yaml
resources:
  requests:
    cpu: 500m      # Increase from 250m
    memory: 1Gi    # Increase from 512Mi
  limits:
    cpu: 1000m
    memory: 2Gi
```

## 🔄 Deployment Workflow

### CI/CD Integration

```bash
# 1. Build stage
docker build -f infra/nginx/Dockerfile -t ecotel/nginx:${BUILD_ID} .

# 2. Push to registry
docker push registry.example.com/ecotel/nginx:${BUILD_ID}

# 3. Update K8s
kubectl set image deployment/nginx \
    nginx=registry.example.com/ecotel/nginx:${BUILD_ID} \
    -n ecotel

# 4. Verify rollout
kubectl rollout status deployment/nginx -n ecotel
```

### Blue-Green Deployment

```yaml
# K8s Deployment with blue-green labels
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-blue
  labels:
    app: nginx
    version: blue
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-green
  labels:
    app: nginx
    version: green

# Service targets the active deployment
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
    version: blue  # Switch to 'green' for failover
```

## 🧪 Testing Deployment

### Test Frontend
```bash
curl -I http://localhost/
# Should return 200 OK

curl http://localhost/
# Should return index.html content
```

### Test API Proxy
```bash
curl http://localhost/api/v1/employees
# Should proxy to backend

curl -H "Authorization: Bearer token" \
     http://localhost/api/v1/employees
# Should forward headers to backend
```

### Test Caching
```bash
# First request (cache miss)
curl -I http://localhost/api/v1/employees
# X-Cache-Status: MISS

# Second request (cache hit)
curl -I http://localhost/api/v1/employees
# X-Cache-Status: HIT
```

### Test Rate Limiting
```bash
# Rapid requests should trigger 429 Too Many Requests
for i in {1..200}; do
    curl http://localhost/api/v1/employees 2>/dev/null | grep -o '"[^"]*"' | head -1
done
```

## 🔧 Maintenance Tasks

### Regular Updates

```bash
# Weekly: Check for security updates
docker pull nginx:latest

# Build with new base image
docker build -f infra/nginx/Dockerfile \
    --build-arg BASE_IMAGE=nginx:alpine \
    -t ecotel/nginx:latest .
```

### Log Rotation

```bash
# infra/nginx/logs directory cleanup
find infra/nginx/logs -type f -mtime +30 -delete
```

### Configuration Validation

```bash
# Before deploying
nginx -t

# Or in Docker
docker run --rm -v $(pwd)/infra/nginx:/etc/nginx \
    nginx:alpine nginx -t
```

## 📞 Support & Troubleshooting

See detailed troubleshooting in [README.md](README.md#-troubleshooting)

For performance issues: [QUICKREF.md](QUICKREF.md#troubleshooting)

---

**Quick Start Command:**
```bash
# Deploy complete stack
bash infra/scripts/deploy.sh

# Verify
kubectl get all -n ecotel

# Access
open http://localhost
```

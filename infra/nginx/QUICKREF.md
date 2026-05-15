# ECOTEL Nginx - Quick Reference Guide

## 🎯 Overview: 3 Roles in 1

```
NGINX (Port 80/443)
│
├─ 1️⃣ WEB SERVER: Serve Frontend React
│   └─ Static files: *.js, *.css, images → Cache 1 year
│   └─ SPA routing: all routes → index.html
│
├─ 2️⃣ REVERSE PROXY: Forward API Requests  
│   └─ /api/* → backend-service:8080
│   └─ Headers: X-Real-IP, X-Forwarded-*
│   └─ Load balancing: least_conn algorithm
│
└─ 3️⃣ LOAD BALANCER: Distribute Backend Traffic
    └─ Multiple backend instances
    └─ Health checks: /actuator/health
    └─ Connection pooling: 32 keepalive
```

## 📋 Configuration Quick Links

| File | Purpose | Key Settings |
|------|---------|--------------|
| `nginx.conf` | Main config | Workers, logging, modules |
| `upstream.conf` | Backend definitions | Load balancing method, health checks |
| `default.conf` | Server config | Locations, proxying, caching |
| `gzip.conf` | Compression | Compression level, file types |
| `security.conf` | Security headers | CSP, X-Frame-Options, etc. |
| `ratelimit.conf` | Rate limiting | Zones and limits |
| `caching.conf` | Cache config | Cache paths, TTL, lock |

## 🔄 Request Flow

```
User Request
    │
    ▼
╔═══════════════════════════════════════╗
║   NGINX (Port 80)                     ║
╚═══════════════════════════════════════╝
    │
    ├─ Static file? (.js, .css, .png)
    │  └─► Serve from /usr/share/nginx/html
    │  └─► Cache-Control: 1 year
    │
    ├─ API request? (/api/*)
    │  ├─► Rate limiting check
    │  ├─► Load balancer selection (least_conn)
    │  ├─► Add headers (X-Real-IP, X-Forwarded-For, etc.)
    │  ├─► Forward to backend-service:8080
    │  ├─► Cache response (5min for GET)
    │  └─► Return to client
    │
    └─ Root path? (/)
       └─► Serve index.html (SPA routing)
           └─► Cache-Control: no-cache
```

## 📍 Important Locations

### Frontend
```nginx
# Root: /
location / {
    try_files $uri $uri/ /index.html;  # SPA fallback
    add_header Cache-Control "public, max-age=0";
}
```

### Static Assets
```nginx
# ~* = case-insensitive regex
location ~* \.(js|css|png|jpg|...)$ {
    expires 1y;                          # 365 days
    add_header Cache-Control "immutable";
}
```

### API Proxy
```nginx
location /api/ {
    limit_req zone=api_limit;            # 100 req/min
    proxy_pass http://backend_api;       # Forward to upstream
    proxy_cache api_cache;               # Cache responses
}
```

### Health Check
```nginx
location /health {
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}
```

## 🎚️ Rate Limiting Zones

| Zone | Limit | Usage |
|------|-------|-------|
| `general_limit` | 10 req/sec | General traffic |
| `api_limit` | 100 req/min | API endpoints |
| `login_limit` | 5 req/min | /api/v1/auth/login |
| `upload_limit` | 1 req/sec | /api/v1/upload |
| `download_limit` | 20 req/sec | /api/v1/download |

## 💾 Caching Strategy

### Static Files
```
Files: *.js, *.css, *.png, etc.
TTL:   1 year (365 days)
Key:   filename
```

### API Responses
```
Files: /api/* (GET requests)
TTL:   5 minutes
Key:   $scheme$method$host$uri
Bypass: On Cache-Control headers
```

### No Cache
```
Files: /api/v1/auth/login (sensitive)
       /api/v1/upload (POST)
```

## 🔐 Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Enable XSS protection |
| `Content-Security-Policy` | `default-src 'self'` | Control resource loading |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer info |

## ⚙️ Load Balancing Methods

### Least Connections (Recommended for APIs)
```nginx
upstream backend_api {
    least_conn;  # Routes to server with least active connections
    server backend1:8080;
    server backend2:8080;
    server backend3:8080;
}
```

### IP Hash (Session Persistence)
```nginx
upstream backend_api {
    ip_hash;  # Same IP always goes to same backend
    server backend1:8080;
    server backend2:8080;
}
```

### Hash on Session ID
```nginx
upstream backend_api {
    hash $cookie_sessionid;  # Route based on session cookie
    server backend1:8080;
    server backend2:8080;
}
```

## 📊 Performance Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| `worker_processes` | `auto` | Match CPU count |
| `worker_connections` | `2048` | Max connections per worker |
| `sendfile` | `on` | Efficient file serving |
| `tcp_nopush` | `on` | Send headers with data |
| `tcp_nodelay` | `on` | Disable Nagle's algorithm |
| `keepalive_timeout` | `65s` | Connection reuse timeout |
| `proxy_buffering` | `on` | Buffer proxy responses |
| `gzip_comp_level` | `6` | Compression level (1-9) |

## 🔄 Reload Configuration (No Downtime)

### Docker
```bash
docker-compose kill -s HUP nginx
```

### Kubernetes
```bash
kubectl exec -n ecotel deployment/nginx -- nginx -s reload
```

### Direct
```bash
nginx -s reload
```

## 📝 Common Tasks

### View Active Connections
```bash
curl http://localhost/nginx-status
```

### Check Configuration Syntax
```bash
nginx -t
```

### View Access Logs
```bash
tail -f logs/nginx/access.log
tail -f logs/nginx/api_access.log
```

### View Error Logs
```bash
tail -f logs/nginx/error.log
```

### Test Performance
```bash
ab -n 1000 -c 10 http://localhost/api/v1/employees
```

### Test Rate Limiting
```bash
for i in {1..20}; do curl http://localhost/api/v1/employees; done
```

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| **502 Bad Gateway** | Backend not running: `curl http://backend:8080/actuator/health` |
| **503 Service Unavailable** | All backends down, check upstream.conf |
| **High latency** | Increase proxy_buffer_size in default.conf |
| **Cache not working** | Check proxy_cache_bypass, no_cache settings |
| **Rate limiting too strict** | Adjust rate limit zones in ratelimit.conf |
| **SPA routing not working** | Check try_files in default.conf |
| **Static files slow** | Verify expires and Cache-Control headers |

## 📚 Files to Edit for Common Changes

### Add New Backend Server
```
Edit: infra/nginx/conf.d/upstream.conf
Add:  server backend4:8080 weight=1;
Reload: nginx -s reload
```

### Change Rate Limit
```
Edit: infra/nginx/conf.d/ratelimit.conf
Modify: rate=X r/Y  (requests per timeframe)
Reload: nginx -s reload
```

### Enable HTTPS
```
Edit: infra/nginx/conf.d/default.conf
Uncomment: HTTPS Configuration section
Add certs: infra/nginx/ssl/cert.pem, key.pem
Reload: nginx -s reload
```

### Adjust Cache TTL
```
Edit: infra/nginx/conf.d/default.conf
Modify: proxy_cache_valid 200 XXm;
Reload: nginx -s reload
```

## 🎯 Production Checklist

- [ ] Enable HTTPS/SSL certificates
- [ ] Configure multiple backend instances
- [ ] Adjust rate limits based on expected traffic
- [ ] Enable security headers (check OWASP)
- [ ] Setup log rotation (logrotate)
- [ ] Configure monitoring/metrics collection
- [ ] Setup health checks
- [ ] Test failover scenarios
- [ ] Performance test with real load
- [ ] Document any custom configurations

## 📞 Testing Script

Run comprehensive tests:
```bash
bash infra/nginx/test-nginx.sh
```

Tests included:
- Nginx availability
- Frontend serving
- Static asset caching
- API reverse proxy
- Gzip compression
- Rate limiting
- Cache status
- Security headers
- Performance benchmark
- SSL/TLS configuration
- SPA routing
- Connection limits

---

**For detailed information**, see [README.md](README.md)

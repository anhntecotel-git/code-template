# ECOTEL Infrastructure Scripts

Bộ scripts hỗ trợ deployment, backup, và quản lý ECOTEL application trên Kubernetes và Docker Compose.

## 📋 Danh Sách Scripts

### 1. `deploy.sh` - Deployment Script
**Mục đích**: Deploy ứng dụng lên Kubernetes cluster

#### Cách sử dụng:
```bash
./deploy.sh [environment] [version]

# Ví dụ:
./deploy.sh                          # Development, latest
./deploy.sh production v1.0.0        # Production, v1.0.0
./deploy.sh staging                  # Staging, latest
```

#### Các bước thực hiện:
1. ✅ Kiểm tra prerequisites (kubectl, docker, kết nối cluster)
2. ✅ Build Docker images (backend, frontend)
3. ✅ Update Kubernetes manifests
4. ✅ Apply K8s resources theo thứ tự:
   - Namespace
   - Secrets
   - ConfigMaps
   - Services
   - Deployments
   - Ingress & Network Policies
5. ✅ Chờ rollout hoàn tất
6. ✅ Verify deployment
7. ✅ Hiển thị deployment info

#### Output:
```
Log file: infra/scripts/logs/deploy_YYYYMMDD_HHMMSS.log
```

---

### 2. `backup.sh` - Backup Script
**Mục đích**: Backup databases, volumes, và K8s resources

#### Cách sử dụng:
```bash
./backup.sh [type] [destination]

# Ví dụ:
./backup.sh                         # Full backup, default location
./backup.sh database               # Database only
./backup.sh volumes                # Volumes only
./backup.sh full /mnt/backups      # Full backup to custom location
```

#### Các loại backup:
| Type | Mô tả |
|------|-------|
| `full` | Backup tất cả: database, volumes, K8s resources, app files |
| `database` | Chỉ backup PostgreSQL |
| `volumes` | Chỉ backup PersistentVolumes |

#### Các bước thực hiện:
1. ✅ Kiểm tra prerequisites
2. ✅ Tạo backup directory
3. ✅ Backup PostgreSQL database
4. ✅ Backup PersistentVolumes
5. ✅ Export K8s resources (Deployments, Services, ConfigMaps)
6. ✅ Backup application source files
7. ✅ Tạo backup summary
8. ✅ Cleanup old backups (> 30 days)
9. ✅ Upload to cloud storage (S3, GCS - optional)

#### Output:
```
Backup directory: backups/backup_YYYYMMDD_HHMMSS/
├── database_YYYYMMDD_HHMMSS.sql.gz
├── volume_*.tar.gz
├── kubernetes_resources_YYYYMMDD_HHMMSS.tar.gz
├── application_source_YYYYMMDD_HHMMSS.tar.gz
└── backup.log
```

#### Environment Variables:
```bash
export POSTGRES_USER="ecotel_user"
export POSTGRES_PASSWORD="your-password"
export BACKUP_S3_BUCKET="your-bucket-name"
```

---

### 3. `start.sh` - Application Start Script
**Mục đích**: Khởi động ứng dụng ở các chế độ khác nhau

#### Cách sử dụng:
```bash
./start.sh [mode] [options]

# Ví dụ:
./start.sh                              # Docker Compose, foreground
./start.sh docker-compose -d -f        # Docker Compose, detached, follow logs
./start.sh kubernetes                  # Deploy to Kubernetes
./start.sh dev                          # Development mode (hot-reload)
./start.sh production -b                # Production mode, rebuild images
```

#### Các chế độ:
| Mode | Mô tả | Dùng cho |
|------|-------|----------|
| `docker-compose` | Docker Compose (mặc định) | Development, testing |
| `kubernetes` | Kubernetes deployment | Production |
| `dev` | Development mode (Maven + npm) | Development with hot-reload |
| `production` | Production mode | Production environment |

#### Options:
```bash
-d, --detach              # Chạy background
-b, --build               # Rebuild images trước khi start
-f, --follow              # Follow logs
--scale-backend N         # Scale backend to N replicas (default: 3)
--scale-frontend N        # Scale frontend to N replicas (default: 3)
```

#### Các bước thực hiện:
1. ✅ Kiểm tra prerequisites
2. ✅ Kiểm tra Docker daemon
3. ✅ Build images (nếu cần)
4. ✅ Khởi động services
5. ✅ Chờ services ready
6. ✅ Hiển thị thông tin startup

#### Output:
```
Services information:
- Backend: http://localhost:8080
- Frontend: http://localhost:3000
- Database: postgresql://postgres:5432/ecotel_db
- Redis: redis://localhost:6379
```

---

## 🚀 Workflow Quản Lý

### Development Environment
```bash
# 1. Start development mode (hot-reload)
./start.sh dev

# 2. Hoặc start with Docker Compose
./start.sh docker-compose -d -f

# 3. View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Staging/Production Deployment
```bash
# 1. Build and deploy
./deploy.sh staging v1.0.0

# 2. Verify
kubectl get pods -n ecotel
kubectl get svc -n ecotel

# 3. Check logs
kubectl logs -n ecotel deployment/backend -f
```

### Backup & Recovery
```bash
# 1. Full backup
./backup.sh full

# 2. Database only backup
./backup.sh database

# 3. View backups
ls -lh backups/

# 4. Restore (manual process)
gunzip backups/backup_YYYYMMDD_HHMMSS/database_*.sql.gz
psql -U ecotel_user -d ecotel_db < database_*.sql
```

---

## 📝 Logging

Tất cả scripts ghi logs chi tiết vào files:
```
infra/scripts/logs/
├── deploy_YYYYMMDD_HHMMSS.log
├── backup_YYYYMMDD_HHMMSS.log (inside backup directory)
└── start_YYYYMMDD_HHMMSS.log
```

Xem logs realtime:
```bash
tail -f infra/scripts/logs/deploy_*.log
```

---

## ⚙️ Configuration

### Environment Variables

#### Deploy Script
```bash
export DOCKER_REGISTRY="your-registry"  # Default: ecotel
export NAMESPACE="ecotel"               # Default: ecotel
```

#### Backup Script
```bash
export POSTGRES_USER="ecotel_user"
export POSTGRES_PASSWORD="your-password"
export BACKUP_S3_BUCKET="your-s3-bucket"
export RETENTION_DAYS=30                # Default: 30
```

#### Start Script
```bash
export DOCKER_REGISTRY="your-registry"
export NAMESPACE="ecotel"
```

### Configuration Files

**Deploy script sử dụng K8s manifests:**
- `infra/k8s/namespace.yaml`
- `infra/k8s/backend-deployment.yaml`
- `infra/k8s/frontend-deployment.yaml`
- `infra/k8s/service.yaml`
- `infra/k8s/ingress.yaml`
- `infra/k8s/configmap.yaml`
- `infra/k8s/secret.yaml`

**Start script sử dụng Docker Compose:**
- `docker-compose.yml`

---

## 🔧 Setup

### 1. Make Scripts Executable
```bash
chmod +x infra/scripts/{deploy,backup,start}.sh
# Hoặc
bash infra/scripts/init.sh
```

### 2. Install Dependencies

#### For Docker Compose Mode
```bash
# Install Docker & Docker Compose
# Ref: https://docs.docker.com/get-docker/
```

#### For Kubernetes Mode
```bash
# Install kubectl
# Ref: https://kubernetes.io/docs/tasks/tools/

# Install Docker
# Ref: https://docs.docker.com/get-docker/

# Configure kubeconfig
kubectl config use-context your-cluster
```

#### For Backup to S3
```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure
```

---

## 🐛 Troubleshooting

### Deploy Script

#### ❌ "Cannot connect to Kubernetes cluster"
```bash
# Check kubeconfig
kubectl config current-context
kubectl cluster-info

# Fix: Set correct context
kubectl config use-context your-cluster
```

#### ❌ "Docker daemon is not running"
```bash
# Start Docker
systemctl start docker          # Linux
open -a Docker                  # Mac
# Or open Docker Desktop (Windows)
```

#### ❌ "Failed to build backend image"
```bash
# Check Java version
java -version  # Should be Java 21

# Check Maven
mvn --version  # Should be 3.9+

# Build manually
cd apps/backend && mvn clean package
```

### Backup Script

#### ❌ "PostgreSQL pod not found"
```bash
# Check if postgres is running
kubectl get pods -n ecotel -l app=postgres

# Start postgres if using docker-compose
docker-compose up postgres -d
```

#### ❌ "Failed to dump database"
```bash
# Check credentials
echo $POSTGRES_PASSWORD

# Test connection
psql -h postgres -U ecotel_user -d ecotel_db -c "SELECT 1"

# Update environment variables if needed
export POSTGRES_PASSWORD="your-password"
```

### Start Script

#### ❌ "Docker Compose not found"
```bash
# Install Docker Compose v2
docker --version  # Check if V2 is included

# Or install separately
pip install docker-compose
```

#### ❌ "Port already in use"
```bash
# Find process using port 8080
lsof -i :8080

# Or use different ports in docker-compose.yml
docker-compose up --build -p
```

---

## 📊 Best Practices

### Deployment
- ✅ Always backup trước deploy production
- ✅ Test trên staging trước
- ✅ Sử dụng version tags (v1.0.0) cho production
- ✅ Monitor logs sau deploy

### Backup
- ✅ Chạy backup hàng ngày
- ✅ Verify backup integrity
- ✅ Test restore process
- ✅ Giữ backups ở multiple locations

### Development
- ✅ Sử dụng dev mode với hot-reload
- ✅ Không commit logs hoặc secrets
- ✅ Cập nhật docker-compose.yml khi có changes

---

## 📞 Support

Cho chi tiết hơn, xem:
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- Project Architecture: [../Architec.md](../../Architec.md)

---

**Last Updated**: 2024-05-13  
**Version**: 1.0.0

#!/bin/bash

################################################################################
# ECOTEL Application Backup Script
# This script backs up databases and application data
# Usage: ./backup.sh [type] [destination]
# Example: ./backup.sh full /mnt/backups
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKUP_TYPE="${1:-full}"
BACKUP_DESTINATION="${2:-${PROJECT_ROOT}/backups}"
NAMESPACE="ecotel"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DESTINATION}/backup_${TIMESTAMP}"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Database credentials
POSTGRES_USER="${POSTGRES_USER:-ecotel_user}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
POSTGRES_DB="${POSTGRES_DB:-ecotel_db}"
POSTGRES_HOST="postgres"
POSTGRES_PORT="5432"

# Compression
COMPRESS_LEVEL=9
COMPRESS_FORMAT="tar.gz"

# Retention policy
RETENTION_DAYS=30

################################################################################
# Utility Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" | tee -a "${LOG_FILE}"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" | tee -a "${LOG_FILE}"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*" | tee -a "${LOG_FILE}"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" | tee -a "${LOG_FILE}"
}

print_header() {
    echo -e "\n${BLUE}================================${NC}" | tee -a "${LOG_FILE}"
    echo -e "${BLUE}$*${NC}" | tee -a "${LOG_FILE}"
    echo -e "${BLUE}================================${NC}\n" | tee -a "${LOG_FILE}"
}

print_usage() {
    cat <<EOF
Usage: $0 [TYPE] [DESTINATION]

Types:
  - full       (default) - Full backup of database and data
  - database   - Database backup only
  - volumes    - PersistentVolume backup only

Destination:
  - /path/to/backup (default: ${PROJECT_ROOT}/backups)

Examples:
  $0                                  # Full backup to default location
  $0 database                         # Database backup only
  $0 full /mnt/external/backups      # Full backup to custom location

EOF
}

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_tools=()
    
    # Check required tools
    for tool in kubectl tar gzip; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
            log_error "$tool is not installed"
        else
            log_success "$tool is installed"
        fi
    done
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        return 1
    fi
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        return 1
    fi
    log_success "Connected to Kubernetes cluster"
    
    # Check namespace exists
    if ! kubectl get namespace "${NAMESPACE}" &> /dev/null; then
        log_error "Namespace '${NAMESPACE}' does not exist"
        return 1
    fi
    log_success "Namespace '${NAMESPACE}' exists"
}

create_backup_directory() {
    print_header "Creating Backup Directory"
    
    if mkdir -p "${BACKUP_DIR}"; then
        log_success "Backup directory created: ${BACKUP_DIR}"
        chmod 700 "${BACKUP_DIR}"
    else
        log_error "Failed to create backup directory"
        return 1
    fi
}

backup_database() {
    print_header "Backing Up Database"
    
    local backup_file="${BACKUP_DIR}/database_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"
    
    log_info "Finding PostgreSQL pod..."
    local postgres_pod=$(kubectl get pods -n "${NAMESPACE}" -l app=postgres \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [ -z "${postgres_pod}" ]; then
        log_warning "PostgreSQL pod not found in cluster"
        log_info "Attempting direct connection to ${POSTGRES_HOST}..."
        
        # Try direct connection (if exposed)
        if PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
            -h "${POSTGRES_HOST}" \
            -p "${POSTGRES_PORT}" \
            -U "${POSTGRES_USER}" \
            -d "${POSTGRES_DB}" \
            --verbose \
            > "${backup_file}" 2>&1; then
            log_success "Database dumped successfully"
        else
            log_error "Failed to dump database"
            return 1
        fi
    else
        log_info "Using pod: ${postgres_pod}"
        
        # Backup via kubectl exec
        if kubectl exec -n "${NAMESPACE}" "${postgres_pod}" \
            -- pg_dump \
            -U "${POSTGRES_USER}" \
            -d "${POSTGRES_DB}" \
            --verbose > "${backup_file}" 2>&1; then
            log_success "Database dumped successfully via pod"
        else
            log_error "Failed to dump database via pod"
            return 1
        fi
    fi
    
    # Compress the backup
    log_info "Compressing database backup..."
    if gzip -v -${COMPRESS_LEVEL} "${backup_file}"; then
        log_success "Database backup compressed: $(du -h "${compressed_file}" | cut -f1)"
        echo "${compressed_file}"
    else
        log_error "Failed to compress database backup"
        return 1
    fi
}

backup_volumes() {
    print_header "Backing Up Persistent Volumes"
    
    log_info "Finding PersistentVolumeClaims in namespace..."
    
    local pvcs=$(kubectl get pvc -n "${NAMESPACE}" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)
    
    if [ -z "${pvcs}" ]; then
        log_warning "No PersistentVolumeClaims found"
        return 0
    fi
    
    for pvc in ${pvcs}; do
        log_info "Backing up PVC: ${pvc}..."
        
        # Create a temporary pod to mount and backup the volume
        local temp_pod="backup-${pvc}-${RANDOM}"
        local volume_mount_path="/mnt/data"
        
        cat <<EOF | kubectl apply -f - &> /dev/null
apiVersion: v1
kind: Pod
metadata:
  name: ${temp_pod}
  namespace: ${NAMESPACE}
spec:
  containers:
  - name: backup
    image: busybox:latest
    command: ["sleep", "3600"]
    volumeMounts:
    - name: data
      mountPath: ${volume_mount_path}
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: ${pvc}
  restartPolicy: Never
EOF
        
        # Wait for pod to be ready
        kubectl wait --for=condition=Ready pod/${temp_pod} \
            -n "${NAMESPACE}" --timeout=60s &> /dev/null || true
        
        # Copy data from pod
        local backup_file="${BACKUP_DIR}/volume_${pvc}_${TIMESTAMP}.tar.gz"
        log_info "Copying data from pod..."
        
        if kubectl cp "${NAMESPACE}/${temp_pod}:${volume_mount_path}" \
            - 2>/dev/null | tar xz -f - 2>/dev/null | gzip -v -${COMPRESS_LEVEL} > "${backup_file}" 2>/dev/null; then
            log_success "Volume backup created: $(du -h "${backup_file}" | cut -f1)"
        else
            log_warning "Failed to backup volume ${pvc}"
        fi
        
        # Cleanup temp pod
        kubectl delete pod ${temp_pod} -n "${NAMESPACE}" --ignore-not-found=true &> /dev/null || true
    done
}

backup_kubernetes_resources() {
    print_header "Backing Up Kubernetes Resources"
    
    log_info "Exporting all Kubernetes resources..."
    
    # Export deployments
    local deployments_file="${BACKUP_DIR}/deployments_${TIMESTAMP}.yaml"
    kubectl get deployments -n "${NAMESPACE}" -o yaml > "${deployments_file}"
    log_success "Deployments exported: $(wc -l < "${deployments_file}") lines"
    
    # Export services
    local services_file="${BACKUP_DIR}/services_${TIMESTAMP}.yaml"
    kubectl get services -n "${NAMESPACE}" -o yaml > "${services_file}"
    log_success "Services exported: $(wc -l < "${services_file}") lines"
    
    # Export configmaps
    local configmaps_file="${BACKUP_DIR}/configmaps_${TIMESTAMP}.yaml"
    kubectl get configmaps -n "${NAMESPACE}" -o yaml > "${configmaps_file}"
    log_success "ConfigMaps exported: $(wc -l < "${configmaps_file}") lines"
    
    # Export persistent volumes (non-sensitive data)
    local pvcs_file="${BACKUP_DIR}/pvcs_${TIMESTAMP}.yaml"
    kubectl get pvc -n "${NAMESPACE}" -o yaml > "${pvcs_file}"
    log_success "PersistentVolumeClaims exported: $(wc -l < "${pvcs_file}") lines"
    
    # Compress all K8s resources
    local k8s_backup="${BACKUP_DIR}/kubernetes_resources_${TIMESTAMP}.tar.gz"
    tar -czf "${k8s_backup}" \
        "${deployments_file}" \
        "${services_file}" \
        "${configmaps_file}" \
        "${pvcs_file}" 2>&1 | tee -a "${LOG_FILE}"
    
    log_success "Kubernetes resources backup: $(du -h "${k8s_backup}" | cut -f1)"
}

backup_application_files() {
    print_header "Backing Up Application Files"
    
    if [ ! -d "${PROJECT_ROOT}/apps" ]; then
        log_warning "Application files directory not found"
        return 0
    fi
    
    log_info "Backing up application source files..."
    
    local app_backup="${BACKUP_DIR}/application_source_${TIMESTAMP}.tar.gz"
    
    tar -czf "${app_backup}" \
        --exclude=node_modules \
        --exclude=target \
        --exclude=.git \
        --exclude=.DS_Store \
        -C "${PROJECT_ROOT}" \
        apps 2>&1 | tee -a "${LOG_FILE}"
    
    log_success "Application backup: $(du -h "${app_backup}" | cut -f1)"
}

create_backup_summary() {
    print_header "Backup Summary"
    
    local total_size=$(du -sh "${BACKUP_DIR}" | cut -f1)
    local file_count=$(find "${BACKUP_DIR}" -type f | wc -l)
    
    cat <<EOF | tee -a "${LOG_FILE}"

Backup Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Backup Type:     ${BACKUP_TYPE}
Backup Path:     ${BACKUP_DIR}
Total Size:      ${total_size}
File Count:      ${file_count}
Timestamp:       ${TIMESTAMP}
Retention:       ${RETENTION_DAYS} days
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files Backed Up:
EOF
    
    find "${BACKUP_DIR}" -type f -exec ls -lh {} \; | tee -a "${LOG_FILE}"
}

cleanup_old_backups() {
    print_header "Cleaning Up Old Backups"
    
    log_info "Removing backups older than ${RETENTION_DAYS} days..."
    
    if find "${BACKUP_DESTINATION}" -maxdepth 1 -type d -name "backup_*" \
        -mtime +${RETENTION_DAYS} -exec rm -rf {} \; 2>/dev/null; then
        log_success "Old backups cleaned up"
    else
        log_warning "No old backups to remove or cleanup failed"
    fi
    
    # Show current backups
    log_info "Current backups:"
    ls -lhd "${BACKUP_DESTINATION}"/backup_* 2>/dev/null | tail -5
}

upload_to_cloud() {
    print_header "Uploading to Cloud Storage (Optional)"
    
    # Check for AWS CLI
    if command -v aws &> /dev/null; then
        log_info "AWS CLI found, uploading to S3..."
        
        local s3_bucket="${BACKUP_S3_BUCKET:-}"
        if [ -n "${s3_bucket}" ]; then
            if aws s3 cp "${BACKUP_DIR}" "s3://${s3_bucket}/backups/backup_${TIMESTAMP}/" \
                --recursive --sse AES256 2>&1 | tee -a "${LOG_FILE}"; then
                log_success "Backup uploaded to S3: s3://${s3_bucket}/backups/backup_${TIMESTAMP}/"
            else
                log_warning "Failed to upload to S3"
            fi
        else
            log_warning "S3 bucket not configured (BACKUP_S3_BUCKET)"
        fi
    else
        log_info "AWS CLI not found, skipping cloud upload"
    fi
}

validate_backup() {
    print_header "Validating Backup"
    
    if [ ! -d "${BACKUP_DIR}" ]; then
        log_error "Backup directory not found"
        return 1
    fi
    
    local file_count=$(find "${BACKUP_DIR}" -type f | wc -l)
    if [ "${file_count}" -gt 0 ]; then
        log_success "Backup validation successful (${file_count} files)"
        return 0
    else
        log_error "Backup validation failed (no files)"
        return 1
    fi
}

main() {
    print_header "ECOTEL Backup Script"
    
    log_info "Script started at $(date)"
    log_info "Backup type: ${BACKUP_TYPE}"
    log_info "Destination: ${BACKUP_DESTINATION}"
    log_info "Backup directory: ${BACKUP_DIR}"
    
    # Execute backup steps
    check_prerequisites || { log_error "Prerequisites check failed"; exit 1; }
    create_backup_directory || { log_error "Directory creation failed"; exit 1; }
    
    case "${BACKUP_TYPE}" in
        full)
            backup_database || log_warning "Database backup failed"
            backup_volumes || log_warning "Volume backup failed"
            backup_kubernetes_resources || log_warning "K8s resource backup failed"
            backup_application_files || log_warning "Application file backup failed"
            ;;
        database)
            backup_database || { log_error "Database backup failed"; exit 1; }
            ;;
        volumes)
            backup_volumes || { log_error "Volume backup failed"; exit 1; }
            ;;
        *)
            log_error "Invalid backup type: ${BACKUP_TYPE}"
            print_usage
            exit 1
            ;;
    esac
    
    create_backup_summary || log_warning "Summary creation failed"
    validate_backup || { log_error "Backup validation failed"; exit 1; }
    cleanup_old_backups || log_warning "Cleanup failed"
    upload_to_cloud || log_warning "Cloud upload failed"
    
    log_success "Backup completed successfully!"
    log_info "Script finished at $(date)"
    
    # Output backup path for automation
    echo "${BACKUP_DIR}"
}

# Handle errors
trap 'log_error "Script failed at line $LINENO"; exit 1' ERR

# Main execution
if [ "${1:-}" == "-h" ] || [ "${1:-}" == "--help" ]; then
    print_usage
    exit 0
fi

main

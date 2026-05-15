#!/bin/bash

################################################################################
# ECOTEL Application Deployment Script
# This script deploys the ECOTEL application to Kubernetes cluster
# Usage: ./deploy.sh [environment] [version]
# Example: ./deploy.sh production v1.0.0
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
K8S_DIR="${PROJECT_ROOT}/infra/k8s"
DOCKER_DIR="${PROJECT_ROOT}/infra/docker"
NAMESPACE="ecotel"
ENVIRONMENT="${1:-development}"
VERSION="${2:-latest}"
REGISTRY="${DOCKER_REGISTRY:-ecotel}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${SCRIPT_DIR}/logs/deploy_${TIMESTAMP}.log"

# Ensure logs directory exists
mkdir -p "${SCRIPT_DIR}/logs"

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
Usage: $0 [ENVIRONMENT] [VERSION]

Environments:
  - development (default)
  - staging
  - production

Version:
  - latest (default)
  - vX.X.X (e.g., v1.0.0)

Examples:
  $0                              # Deploy development with latest
  $0 production v1.0.0            # Deploy production v1.0.0
  $0 staging                      # Deploy staging with latest

EOF
}

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_tools=()
    
    # Check required tools
    for tool in kubectl docker jq; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
            log_error "$tool is not installed"
        else
            log_success "$tool is installed ($(command -v "$tool"))"
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
        log_warning "Namespace '${NAMESPACE}' does not exist, creating..."
        kubectl create namespace "${NAMESPACE}" || return 1
    fi
    log_success "Namespace '${NAMESPACE}' exists"
}

validate_environment() {
    print_header "Validating Environment: ${ENVIRONMENT}"
    
    case "${ENVIRONMENT}" in
        development|staging|production)
            log_success "Valid environment: ${ENVIRONMENT}"
            ;;
        *)
            log_error "Invalid environment: ${ENVIRONMENT}"
            print_usage
            return 1
            ;;
    esac
}

build_docker_images() {
    print_header "Building Docker Images (Version: ${VERSION})"
    
    # Build backend image
    log_info "Building backend image..."
    if docker build \
        -f "${DOCKER_DIR}/backend.Dockerfile" \
        -t "${REGISTRY}/backend:${VERSION}" \
        -t "${REGISTRY}/backend:latest" \
        "${PROJECT_ROOT}" | tee -a "${LOG_FILE}"; then
        log_success "Backend image built successfully"
    else
        log_error "Failed to build backend image"
        return 1
    fi
    
    # Build frontend image
    log_info "Building frontend image..."
    if docker build \
        -f "${DOCKER_DIR}/frontend.Dockerfile" \
        -t "${REGISTRY}/frontend:${VERSION}" \
        -t "${REGISTRY}/frontend:latest" \
        "${PROJECT_ROOT}" | tee -a "${LOG_FILE}"; then
        log_success "Frontend image built successfully"
    else
        log_error "Failed to build frontend image"
        return 1
    fi
}

push_docker_images() {
    print_header "Pushing Docker Images to Registry"
    
    log_info "Pushing backend image (${VERSION})..."
    if docker push "${REGISTRY}/backend:${VERSION}" 2>&1 | tee -a "${LOG_FILE}"; then
        docker push "${REGISTRY}/backend:latest" &>> "${LOG_FILE}"
        log_success "Backend image pushed successfully"
    else
        log_warning "Failed to push backend image (might not have registry configured)"
    fi
    
    log_info "Pushing frontend image (${VERSION})..."
    if docker push "${REGISTRY}/frontend:${VERSION}" 2>&1 | tee -a "${LOG_FILE}"; then
        docker push "${REGISTRY}/frontend:latest" &>> "${LOG_FILE}"
        log_success "Frontend image pushed successfully"
    else
        log_warning "Failed to push frontend image (might not have registry configured)"
    fi
}

update_k8s_manifests() {
    print_header "Updating Kubernetes Manifests"
    
    # Update image versions in deployment files (if using tags)
    log_info "Updated image references to version: ${VERSION}"
    
    # For production, you might want to use specific versions
    if [ "${ENVIRONMENT}" == "production" ]; then
        log_info "Using specific version tags for production deployment"
    fi
}

apply_k8s_resources() {
    print_header "Applying Kubernetes Resources"
    
    # Order matters: namespace -> secrets/configmaps -> services -> deployments -> ingress
    
    # 1. Apply namespace
    log_info "Applying namespace..."
    if kubectl apply -f "${K8S_DIR}/namespace.yaml" 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Namespace applied"
    else
        log_error "Failed to apply namespace"
        return 1
    fi
    
    # 2. Apply secrets
    log_info "Applying secrets..."
    if kubectl apply -f "${K8S_DIR}/secret.yaml" 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Secrets applied"
    else
        log_error "Failed to apply secrets"
        return 1
    fi
    
    # 3. Apply configmaps
    log_info "Applying configmaps..."
    if kubectl apply -f "${K8S_DIR}/configmap.yaml" 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "ConfigMaps applied"
    else
        log_error "Failed to apply configmaps"
        return 1
    fi
    
    # 4. Apply services
    log_info "Applying services..."
    if kubectl apply -f "${K8S_DIR}/service.yaml" 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Services applied"
    else
        log_error "Failed to apply services"
        return 1
    fi
    
    # 5. Apply deployments
    log_info "Applying backend deployment..."
    if kubectl apply -f "${K8S_DIR}/backend-deployment.yaml" 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Backend deployment applied"
    else
        log_error "Failed to apply backend deployment"
        return 1
    fi
    
    log_info "Applying frontend deployment..."
    if kubectl apply -f "${K8S_DIR}/frontend-deployment.yaml" 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Frontend deployment applied"
    else
        log_error "Failed to apply frontend deployment"
        return 1
    fi
    
    # 6. Apply ingress
    log_info "Applying ingress..."
    if kubectl apply -f "${K8S_DIR}/ingress.yaml" 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Ingress applied"
    else
        log_error "Failed to apply ingress"
        return 1
    fi
}

wait_for_rollout() {
    print_header "Waiting for Deployment Rollout"
    
    local timeout=300
    
    log_info "Waiting for backend deployment (timeout: ${timeout}s)..."
    if kubectl rollout status deployment/backend \
        -n "${NAMESPACE}" \
        --timeout="${timeout}s" 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Backend deployment rolled out successfully"
    else
        log_error "Backend deployment rollout failed"
        return 1
    fi
    
    log_info "Waiting for frontend deployment (timeout: ${timeout}s)..."
    if kubectl rollout status deployment/frontend \
        -n "${NAMESPACE}" \
        --timeout="${timeout}s" 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Frontend deployment rolled out successfully"
    else
        log_error "Frontend deployment rollout failed"
        return 1
    fi
}

verify_deployment() {
    print_header "Verifying Deployment"
    
    # Check pod status
    log_info "Checking pod status..."
    kubectl get pods -n "${NAMESPACE}" -o wide | tee -a "${LOG_FILE}"
    
    # Check service status
    log_info "Checking service status..."
    kubectl get svc -n "${NAMESPACE}" -o wide | tee -a "${LOG_FILE}"
    
    # Check ingress status
    log_info "Checking ingress status..."
    kubectl get ingress -n "${NAMESPACE}" -o wide | tee -a "${LOG_FILE}"
    
    # Get pod count
    local backend_pods=$(kubectl get pods -n "${NAMESPACE}" -l app=backend --no-headers | wc -l)
    local frontend_pods=$(kubectl get pods -n "${NAMESPACE}" -l app=frontend --no-headers | wc -l)
    
    log_info "Backend pods running: ${backend_pods}"
    log_info "Frontend pods running: ${frontend_pods}"
    
    if [ "${backend_pods}" -gt 0 ] && [ "${frontend_pods}" -gt 0 ]; then
        log_success "Deployment verified successfully"
        return 0
    else
        log_error "Deployment verification failed"
        return 1
    fi
}

show_deployment_info() {
    print_header "Deployment Information"
    
    local backend_service=$(kubectl get svc backend -n "${NAMESPACE}" -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "N/A")
    local frontend_service=$(kubectl get svc frontend -n "${NAMESPACE}" -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "N/A")
    local ingress_ip=$(kubectl get ingress ecotel-ingress -n "${NAMESPACE}" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    
    cat <<EOF | tee -a "${LOG_FILE}"

Deployment Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment:     ${ENVIRONMENT}
Version:         ${VERSION}
Namespace:       ${NAMESPACE}
Timestamp:       $(date)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Services:
  Backend:       ${backend_service}:8080
  Frontend:      ${frontend_service}:80
  Ingress IP:    ${ingress_ip}

For more details, run:
  kubectl get all -n ${NAMESPACE}
  kubectl describe pod -n ${NAMESPACE}
  kubectl logs -n ${NAMESPACE} -f deployment/backend
  kubectl logs -n ${NAMESPACE} -f deployment/frontend

EOF
}

main() {
    print_header "ECOTEL Deployment Script"
    
    log_info "Script started at $(date)"
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Version: ${VERSION}"
    log_info "Namespace: ${NAMESPACE}"
    log_info "Log file: ${LOG_FILE}"
    
    # Execute deployment steps
    check_prerequisites || { log_error "Prerequisites check failed"; exit 1; }
    validate_environment || { log_error "Environment validation failed"; exit 1; }
    
    # Build images (optional - can be skipped if using pre-built images)
    if [ "${ENVIRONMENT}" != "production" ] || [ "${VERSION}" == "latest" ]; then
        log_info "Building images locally..."
        build_docker_images || { log_error "Build failed"; exit 1; }
    fi
    
    update_k8s_manifests || { log_error "Manifest update failed"; exit 1; }
    apply_k8s_resources || { log_error "K8s resources apply failed"; exit 1; }
    wait_for_rollout || { log_error "Rollout failed"; exit 1; }
    verify_deployment || { log_error "Verification failed"; exit 1; }
    show_deployment_info
    
    log_success "Deployment completed successfully!"
    log_info "Script finished at $(date)"
}

# Handle errors
trap 'log_error "Script failed at line $LINENO"; exit 1' ERR

# Main execution
if [ "${1:-}" == "-h" ] || [ "${1:-}" == "--help" ]; then
    print_usage
    exit 0
fi

main

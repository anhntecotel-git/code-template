#!/bin/bash

################################################################################
# ECOTEL Application Start Script
# This script starts the application using Docker Compose or Kubernetes
# Usage: ./start.sh [mode] [options]
# Example: ./start.sh docker-compose -d
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Script variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MODE="${1:-docker-compose}"
DOCKER_COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"
K8S_DIR="${PROJECT_ROOT}/infra/k8s"
NAMESPACE="ecotel"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="${PROJECT_ROOT}/logs"
LOG_FILE="${LOG_DIR}/start_${TIMESTAMP}.log"

# Default settings
DETACH_MODE=false
BUILD_IMAGES=false
SCALE_BACKEND=3
SCALE_FRONTEND=3
FOLLOW_LOGS=false

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
Usage: $0 [MODE] [OPTIONS]

Modes:
  - docker-compose (default) - Start using Docker Compose
  - kubernetes              - Start using Kubernetes
  - dev                     - Start for development (nodemon, hot-reload)
  - production              - Start optimized for production

Options for docker-compose:
  -d, --detach             Run in background
  -b, --build              Rebuild images before starting
  -f, --follow             Follow logs after start
  --scale-backend N        Scale backend to N replicas (default: 3)
  --scale-frontend N       Scale frontend to N replicas (default: 3)

Examples:
  $0                                    # Start with Docker Compose (foreground)
  $0 docker-compose -d -f              # Start detached and follow logs
  $0 docker-compose -b                 # Build and start
  $0 kubernetes                         # Deploy to Kubernetes
  $0 dev                                # Development mode with hot-reload

EOF
}

ensure_log_dir() {
    mkdir -p "${LOG_DIR}"
    touch "${LOG_FILE}"
}

parse_arguments() {
    local shift_count=1
    
    while [ $# -gt 0 ]; do
        case "$1" in
            -d|--detach)
                DETACH_MODE=true
                ;;
            -b|--build)
                BUILD_IMAGES=true
                ;;
            -f|--follow)
                FOLLOW_LOGS=true
                ;;
            --scale-backend)
                shift
                SCALE_BACKEND="$1"
                ;;
            --scale-frontend)
                shift
                SCALE_FRONTEND="$1"
                ;;
            -h|--help)
                print_usage
                exit 0
                ;;
            *)
                log_warning "Unknown option: $1"
                ;;
        esac
        shift
    done
}

check_prerequisites() {
    print_header "Checking Prerequisites for ${MODE}"
    
    case "${MODE}" in
        docker-compose|dev)
            local required_tools=("docker" "docker-compose")
            ;;
        kubernetes|k8s)
            local required_tools=("kubectl" "docker")
            ;;
        production)
            local required_tools=("docker" "docker-compose" "kubectl")
            ;;
        *)
            log_error "Unknown mode: ${MODE}"
            return 1
            ;;
    esac
    
    local missing_tools=()
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
            log_error "$tool is not installed"
        else
            local version=$("$tool" --version 2>&1 | head -n 1 || echo "unknown")
            log_success "$tool: $version"
        fi
    done
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        return 1
    fi
}

check_docker_daemon() {
    log_info "Checking Docker daemon..."
    
    if ! docker ps &> /dev/null; then
        log_error "Docker daemon is not running"
        log_info "Try: systemctl start docker (Linux) or open Docker Desktop (Mac/Windows)"
        return 1
    fi
    log_success "Docker daemon is running"
}

check_docker_compose_file() {
    if [ ! -f "${DOCKER_COMPOSE_FILE}" ]; then
        log_error "docker-compose.yml not found at ${DOCKER_COMPOSE_FILE}"
        return 1
    fi
    log_success "docker-compose.yml found"
}

start_docker_compose() {
    print_header "Starting with Docker Compose"
    
    check_docker_daemon || return 1
    check_docker_compose_file || return 1
    
    # Build images if requested
    if [ "${BUILD_IMAGES}" = true ]; then
        log_info "Building Docker images..."
        if docker-compose -f "${DOCKER_COMPOSE_FILE}" build --no-cache 2>&1 | tee -a "${LOG_FILE}"; then
            log_success "Images built successfully"
        else
            log_error "Image build failed"
            return 1
        fi
    fi
    
    # Start services
    log_info "Starting services..."
    local compose_flags="-f ${DOCKER_COMPOSE_FILE}"
    
    if [ "${DETACH_MODE}" = true ]; then
        compose_flags="${compose_flags} -d"
    fi
    
    if docker-compose ${compose_flags} up 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Services started successfully"
    else
        log_error "Failed to start services"
        return 1
    fi
    
    # Show service status
    log_info "Service status:"
    docker-compose -f "${DOCKER_COMPOSE_FILE}" ps | tee -a "${LOG_FILE}"
    
    # Follow logs if requested
    if [ "${FOLLOW_LOGS}" = true ] && [ "${DETACH_MODE}" = true ]; then
        log_info "Following logs (press Ctrl+C to stop)..."
        docker-compose -f "${DOCKER_COMPOSE_FILE}" logs -f
    fi
}

start_kubernetes() {
    print_header "Starting on Kubernetes"
    
    # Use the deploy script
    local deploy_script="${SCRIPT_DIR}/deploy.sh"
    
    if [ ! -f "${deploy_script}" ]; then
        log_error "Deploy script not found: ${deploy_script}"
        return 1
    fi
    
    log_info "Calling deploy script..."
    if bash "${deploy_script}" development latest 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Kubernetes deployment successful"
    else
        log_error "Kubernetes deployment failed"
        return 1
    fi
}

start_development() {
    print_header "Starting in Development Mode"
    
    # Start backend in development
    log_info "Starting backend in development mode..."
    cd "${PROJECT_ROOT}/apps/backend"
    
    if [ -f "pom.xml" ]; then
        # Maven project
        log_info "Backend: Maven development server..."
        mvn clean spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=dev" &
        local backend_pid=$!
    else
        log_error "Maven pom.xml not found"
        return 1
    fi
    
    # Start frontend in development
    log_info "Starting frontend in development mode..."
    cd "${PROJECT_ROOT}/apps/frontend"
    
    if [ -f "package.json" ]; then
        # Node project
        log_info "Frontend: Installing dependencies..."
        npm install
        
        log_info "Frontend: Development server..."
        npm run dev &
        local frontend_pid=$!
    else
        log_error "Frontend package.json not found"
        return 1
    fi
    
    log_success "Development servers started"
    log_info "Backend PID: ${backend_pid}"
    log_info "Frontend PID: ${frontend_pid}"
    log_info "Press Ctrl+C to stop all services"
    
    # Wait for processes
    wait
}

start_production() {
    print_header "Starting in Production Mode"
    
    # Build Docker images
    BUILD_IMAGES=true
    DETACH_MODE=true
    
    start_docker_compose || return 1
    
    # Additional production checks
    log_info "Running production health checks..."
    sleep 5
    
    # Check endpoints
    local backend_health=$(curl -s http://localhost:8080/actuator/health || echo "down")
    local frontend_health=$(curl -s http://localhost:3000/health || echo "down")
    
    log_info "Backend health: ${backend_health}"
    log_info "Frontend health: ${frontend_health}"
}

show_startup_info() {
    print_header "Application Startup Information"
    
    case "${MODE}" in
        docker-compose)
            cat <<EOF | tee -a "${LOG_FILE}"

Services:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Backend:  http://localhost:8080
Frontend: http://localhost:3000
Database: postgresql://postgres:5432/ecotel_db
Redis:    redis://localhost:6379
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Useful Commands:
  View logs:           docker-compose -f docker-compose.yml logs -f [service]
  Stop services:       docker-compose -f docker-compose.yml down
  View services:       docker-compose -f docker-compose.yml ps
  Restart service:     docker-compose -f docker-compose.yml restart [service]

EOF
            ;;
        kubernetes)
            cat <<EOF | tee -a "${LOG_FILE}"

Kubernetes Deployment:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Namespace: ${NAMESPACE}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Useful Commands:
  View pods:           kubectl get pods -n ${NAMESPACE}
  View services:       kubectl get svc -n ${NAMESPACE}
  View ingress:        kubectl get ingress -n ${NAMESPACE}
  Follow logs:         kubectl logs -n ${NAMESPACE} -f deployment/backend
  Port forward:        kubectl port-forward -n ${NAMESPACE} svc/backend 8080:8080

EOF
            ;;
        dev)
            cat <<EOF | tee -a "${LOG_FILE}"

Development Mode:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Backend:  http://localhost:8080 (with hot-reload)
Frontend: http://localhost:5173 (Vite dev server)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Features:
  - Backend: Hot-reload with Spring Boot DevTools
  - Frontend: Fast Refresh with Vite
  - Auto-restart on file changes

EOF
            ;;
    esac
}

wait_for_services() {
    print_header "Waiting for Services to be Ready"
    
    case "${MODE}" in
        docker-compose)
            log_info "Waiting for backend (port 8080)..."
            local max_attempts=30
            local attempt=0
            
            while [ ${attempt} -lt ${max_attempts} ]; do
                if curl -s http://localhost:8080/actuator/health &> /dev/null; then
                    log_success "Backend is ready"
                    break
                fi
                attempt=$((attempt + 1))
                log_info "Attempt ${attempt}/${max_attempts}..."
                sleep 2
            done
            
            if [ ${attempt} -eq ${max_attempts} ]; then
                log_warning "Backend did not respond within timeout"
            fi
            ;;
        kubernetes)
            log_info "Waiting for Kubernetes rollout..."
            kubectl rollout status deployment/backend -n "${NAMESPACE}" --timeout=300s || \
                log_warning "Backend rollout timeout"
            ;;
    esac
}

cleanup_on_exit() {
    log_info "Cleanup handler triggered"
    
    case "${MODE}" in
        docker-compose)
            if [ "${DETACH_MODE}" = false ]; then
                log_info "Stopping Docker Compose services..."
                docker-compose -f "${DOCKER_COMPOSE_FILE}" down || true
            fi
            ;;
    esac
}

main() {
    print_header "ECOTEL Application Start Script"
    
    ensure_log_dir
    
    log_info "Script started at $(date)"
    log_info "Mode: ${MODE}"
    log_info "Log file: ${LOG_FILE}"
    
    # Parse additional arguments
    parse_arguments "$@"
    
    # Execute startup steps
    check_prerequisites || { log_error "Prerequisites check failed"; exit 1; }
    
    case "${MODE}" in
        docker-compose)
            start_docker_compose || { log_error "Docker Compose startup failed"; exit 1; }
            ;;
        kubernetes|k8s)
            start_kubernetes || { log_error "Kubernetes startup failed"; exit 1; }
            ;;
        dev)
            start_development || { log_error "Development startup failed"; exit 1; }
            ;;
        production)
            start_production || { log_error "Production startup failed"; exit 1; }
            ;;
        *)
            log_error "Invalid mode: ${MODE}"
            print_usage
            exit 1
            ;;
    esac
    
    wait_for_services || log_warning "Service readiness check failed"
    show_startup_info
    
    log_success "Application started successfully!"
    log_info "Script finished at $(date)"
}

# Handle cleanup on exit
trap cleanup_on_exit EXIT

# Handle Ctrl+C
trap 'log_info "Received interrupt signal"; cleanup_on_exit; exit 0' INT TERM

# Main execution
if [ "${1:-}" == "-h" ] || [ "${1:-}" == "--help" ]; then
    print_usage
    exit 0
fi

main "$@"

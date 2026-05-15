#!/bin/bash

################################################################################
# ECOTEL Nginx Configuration & Performance Testing Script
# Test reverse proxy, caching, rate limiting, and load balancing
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NGINX_HOST="${1:-http://localhost}"
NGINX_PORT="${2:-80}"
BASE_URL="${NGINX_HOST}:${NGINX_PORT}"
BACKEND_URL="${NGINX_HOST}:8080"
TIMEOUT=10
RESULTS_FILE="nginx-test-results.log"

################################################################################
# Utility Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" | tee -a "${RESULTS_FILE}"
}

log_success() {
    echo -e "${GREEN}[✓ SUCCESS]${NC} $*" | tee -a "${RESULTS_FILE}"
}

log_error() {
    echo -e "${RED}[✗ ERROR]${NC} $*" | tee -a "${RESULTS_FILE}"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*" | tee -a "${RESULTS_FILE}"
}

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}" | tee -a "${RESULTS_FILE}"
    echo -e "${BLUE}$*${NC}" | tee -a "${RESULTS_FILE}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n" | tee -a "${RESULTS_FILE}"
}

print_usage() {
    cat <<EOF
Usage: $0 [NGINX_HOST] [PORT]

Examples:
  $0                                    # Test localhost:80
  $0 http://localhost 8080              # Test custom port
  $0 http://production.example.com 80   # Test production

EOF
}

################################################################################
# Test Functions
################################################################################

test_nginx_availability() {
    print_header "Test 1: Nginx Availability"
    
    log_info "Testing connection to ${BASE_URL}..."
    
    if curl -s -f -m ${TIMEOUT} "${BASE_URL}/health" > /dev/null 2>&1; then
        log_success "Nginx is responding"
        return 0
    else
        log_error "Nginx is not responding at ${BASE_URL}"
        return 1
    fi
}

test_frontend_serving() {
    print_header "Test 2: Frontend Static Content Serving"
    
    log_info "Testing root path (/)..."
    
    response=$(curl -s -I -m ${TIMEOUT} "${BASE_URL}/" 2>&1)
    
    if echo "${response}" | grep -q "200"; then
        log_success "Frontend root path returns 200 OK"
    else
        log_error "Frontend root path returned error"
        echo "${response}" | tee -a "${RESULTS_FILE}"
        return 1
    fi
    
    # Check for Security headers
    log_info "Checking security headers..."
    
    if echo "${response}" | grep -q "X-Content-Type-Options"; then
        log_success "X-Content-Type-Options header present"
    else
        log_warning "X-Content-Type-Options header missing"
    fi
    
    if echo "${response}" | grep -q "X-Frame-Options"; then
        log_success "X-Frame-Options header present"
    else
        log_warning "X-Frame-Options header missing"
    fi
}

test_static_assets() {
    print_header "Test 3: Static Assets Caching"
    
    log_info "Testing static asset serving (.js file)..."
    
    # Make a request to a JS file
    response=$(curl -s -I -m ${TIMEOUT} "${BASE_URL}/assets/main.js" 2>&1 || echo "")
    
    if [ -z "${response}" ]; then
        log_warning "No static assets found (expected in dev environment)"
        return 0
    fi
    
    if echo "${response}" | grep -q "Cache-Control: public"; then
        log_success "Static asset caching headers correct"
    else
        log_warning "Static asset caching may not be configured"
    fi
}

test_api_proxy() {
    print_header "Test 4: API Reverse Proxy (/api/ → backend)"
    
    log_info "Testing API endpoint: /api/v1/employees..."
    
    response=$(curl -s -I -m ${TIMEOUT} "${BASE_URL}/api/v1/employees" 2>&1)
    
    if echo "${response}" | grep -q "200\|401\|403"; then
        log_success "API proxy is routing requests correctly"
    elif echo "${response}" | grep -q "502\|503\|504"; then
        log_error "Backend service is unreachable (${response})"
        return 1
    else
        log_warning "Unexpected response: $(echo ${response} | head -n 1)"
    fi
}

test_gzip_compression() {
    print_header "Test 5: Gzip Compression"
    
    log_info "Testing gzip compression..."
    
    response=$(curl -s -I -H "Accept-Encoding: gzip" -m ${TIMEOUT} \
        "${BASE_URL}/api/v1/employees" 2>&1)
    
    if echo "${response}" | grep -q "Content-Encoding: gzip"; then
        log_success "Gzip compression is enabled"
    else
        log_warning "Gzip compression may not be active"
    fi
}

test_rate_limiting() {
    print_header "Test 6: Rate Limiting"
    
    log_info "Sending rapid requests to test rate limiting..."
    
    local success_count=0
    local rate_limited=0
    
    for i in {1..20}; do
        response=$(curl -s -o /dev/null -w "%{http_code}" -m ${TIMEOUT} \
            "${BASE_URL}/api/v1/employees" 2>&1)
        
        if [ "${response}" = "200" ] || [ "${response}" = "401" ]; then
            ((success_count++))
        elif [ "${response}" = "429" ]; then
            ((rate_limited++))
        fi
    done
    
    log_info "Successful: ${success_count}, Rate Limited: ${rate_limited}"
    
    if [ ${rate_limited} -gt 0 ]; then
        log_success "Rate limiting is working"
    else
        log_warning "Rate limiting may not be triggered (high limit or rapid requests not blocked)"
    fi
}

test_cache_status() {
    print_header "Test 7: Response Caching"
    
    log_info "Testing cache status header..."
    
    response=$(curl -s -I -m ${TIMEOUT} "${BASE_URL}/api/v1/employees" 2>&1)
    
    if echo "${response}" | grep -q "X-Cache-Status"; then
        cache_status=$(echo "${response}" | grep "X-Cache-Status" | cut -d' ' -f2)
        log_success "Cache status header: ${cache_status}"
    else
        log_warning "Cache status header not found"
    fi
}

test_nginx_status() {
    print_header "Test 8: Nginx Internal Status"
    
    log_info "Testing nginx status endpoint (/nginx-status)..."
    
    response=$(curl -s -m ${TIMEOUT} "${BASE_URL}/nginx-status" 2>&1)
    
    if echo "${response}" | grep -q "Active connections"; then
        log_success "Nginx status endpoint is accessible"
        echo "${response}" | tee -a "${RESULTS_FILE}"
    else
        log_warning "Nginx status endpoint not accessible"
    fi
}

test_health_check() {
    print_header "Test 9: Health Check Endpoint"
    
    log_info "Testing health endpoint..."
    
    response=$(curl -s -m ${TIMEOUT} "${BASE_URL}/health" 2>&1)
    
    if echo "${response}" | grep -q "healthy"; then
        log_success "Health check is working"
    else
        log_error "Health check endpoint failed"
        return 1
    fi
}

test_backend_connectivity() {
    print_header "Test 10: Backend Service Connectivity"
    
    log_info "Testing backend service health at ${BACKEND_URL}..."
    
    if curl -s -f -m ${TIMEOUT} "${BACKEND_URL}/actuator/health" > /dev/null 2>&1; then
        log_success "Backend service is healthy"
    else
        log_warning "Backend service may not be running"
    fi
}

test_response_headers() {
    print_header "Test 11: Security Response Headers"
    
    log_info "Verifying security headers..."
    
    response=$(curl -s -I -m ${TIMEOUT} "${BASE_URL}/" 2>&1)
    
    local headers_checked=0
    local headers_found=0
    
    local required_headers=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
    )
    
    for header in "${required_headers[@]}"; do
        ((headers_checked++))
        if echo "${response}" | grep -q "${header}"; then
            ((headers_found++))
            log_success "Header present: ${header}"
        else
            log_warning "Header missing: ${header}"
        fi
    done
    
    log_info "Security headers: ${headers_found}/${headers_checked} found"
}

test_performance() {
    print_header "Test 12: Performance Test (Benchmarking)"
    
    log_info "Running performance benchmark (100 requests, 10 concurrent)..."
    
    if command -v ab &> /dev/null; then
        # Use Apache Bench if available
        ab -n 100 -c 10 -q "${BASE_URL}/api/v1/employees" 2>&1 | tee -a "${RESULTS_FILE}"
        log_success "Benchmark complete"
    else
        log_warning "Apache Bench (ab) not installed, skipping performance test"
        log_info "Install with: apt-get install apache2-utils"
    fi
}

test_ssl_configuration() {
    print_header "Test 13: SSL/TLS Configuration"
    
    # Check if HTTPS is available
    if curl -s -k -I -m ${TIMEOUT} "https://${NGINX_HOST}" > /dev/null 2>&1; then
        log_success "SSL/HTTPS is configured"
        
        # Check SSL protocol
        if command -v openssl &> /dev/null; then
            log_info "Checking SSL/TLS protocols..."
            openssl s_client -connect "${NGINX_HOST}:443" -tls1_2 < /dev/null 2>&1 | grep -q "Protocol" && \
                log_success "TLS 1.2 is supported"
        fi
    else
        log_info "HTTPS not available (expected for HTTP-only setup)"
    fi
}

test_spa_routing() {
    print_header "Test 14: SPA Routing (React Router)"
    
    log_info "Testing SPA fallback routing..."
    
    # Test non-existent route that should fallback to index.html
    response=$(curl -s -m ${TIMEOUT} "${BASE_URL}/non-existent-route" 2>&1)
    
    if echo "${response}" | grep -q "index\|html\|DOCTYPE"; then
        log_success "SPA routing fallback is working"
    else
        log_warning "SPA routing may not be configured correctly"
    fi
}

test_connection_limits() {
    print_header "Test 15: Connection Limits"
    
    log_info "Testing connection limits (spawning 20 concurrent connections)..."
    
    local limit_test_passed=true
    
    for i in {1..20}; do
        (curl -s -m ${TIMEOUT} "${BASE_URL}/health" > /dev/null 2>&1) &
    done
    
    wait
    
    if [ $? -eq 0 ]; then
        log_success "Connection limits test passed"
    else
        log_warning "Some connections may have been rate limited"
    fi
}

################################################################################
# Summary Report
################################################################################

generate_summary() {
    print_header "Test Summary Report"
    
    log_info "Tests completed at $(date)"
    log_info "Target URL: ${BASE_URL}"
    log_info "Results saved to: ${RESULTS_FILE}"
    
    local pass_count=$(grep -c "SUCCESS" "${RESULTS_FILE}" || echo "0")
    local fail_count=$(grep -c "ERROR" "${RESULTS_FILE}" || echo "0")
    local warn_count=$(grep -c "WARNING" "${RESULTS_FILE}" || echo "0")
    
    echo -e "\n${BLUE}Results:${NC}" | tee -a "${RESULTS_FILE}"
    echo "  ✓ Passed:  ${pass_count}" | tee -a "${RESULTS_FILE}"
    echo "  ✗ Failed:  ${fail_count}" | tee -a "${RESULTS_FILE}"
    echo "  ⚠ Warning: ${warn_count}" | tee -a "${RESULTS_FILE}"
    
    if [ ${fail_count} -eq 0 ]; then
        log_success "All critical tests passed!"
    else
        log_error "Some tests failed, check results"
    fi
}

################################################################################
# Main Execution
################################################################################

main() {
    # Clear previous results
    > "${RESULTS_FILE}"
    
    print_header "ECOTEL Nginx Configuration Testing"
    
    log_info "Configuration:"
    log_info "  Host: ${NGINX_HOST}"
    log_info "  Port: ${NGINX_PORT}"
    log_info "  Base URL: ${BASE_URL}"
    log_info "  Timeout: ${TIMEOUT}s"
    
    # Run all tests
    test_nginx_availability || exit 1
    test_frontend_serving
    test_static_assets
    test_api_proxy
    test_gzip_compression
    test_rate_limiting
    test_cache_status
    test_nginx_status
    test_health_check
    test_backend_connectivity
    test_response_headers
    test_performance
    test_ssl_configuration
    test_spa_routing
    test_connection_limits
    
    generate_summary
}

# Show help
if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
    print_usage
    exit 0
fi

main

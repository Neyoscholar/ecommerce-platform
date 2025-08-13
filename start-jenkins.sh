#!/bin/bash

# E-commerce Platform Jenkins Startup Script
# This script starts Jenkins locally for CI/CD development and testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install it and try again."
        exit 1
    fi
    
    # Check if ports are available
    if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "Port 8080 is already in use. Jenkins may not start properly."
    fi
    
    if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "Port 5000 is already in use. Docker registry may not start properly."
    fi
    
    log_success "Prerequisites check passed"
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    
    mkdir -p "$SCRIPT_DIR/nginx/ssl"
    mkdir -p "$SCRIPT_DIR/deploy/backups"
    
    log_success "Directories created"
}

# Start Jenkins services
start_jenkins() {
    log_info "Starting Jenkins services..."
    
    cd "$SCRIPT_DIR"
    
    # Start Jenkins with Docker Compose
    docker-compose -f docker-compose.jenkins.yml up -d
    
    log_success "Jenkins services started"
}

# Wait for Jenkins to be ready
wait_for_jenkins() {
    log_info "Waiting for Jenkins to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:8080/login > /dev/null 2>&1; then
            log_success "Jenkins is ready!"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts - Jenkins not ready yet, waiting..."
        sleep 10
        ((attempt++))
    done
    
    log_error "Jenkins failed to start within the expected time"
    return 1
}

# Get Jenkins admin password
get_admin_password() {
    log_info "Getting Jenkins admin password..."
    
    if docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword 2>/dev/null; then
        log_success "Jenkins admin password retrieved"
    else
        log_warning "Could not retrieve Jenkins admin password. Check if Jenkins container is running."
    fi
}

# Show service status
show_status() {
    log_info "Showing service status..."
    
    echo -e "\n=== Docker Services Status ==="
    docker-compose -f docker-compose.jenkins.yml ps
    
    echo -e "\n=== Jenkins URLs ==="
    echo "Jenkins: http://localhost:8080"
    echo "Docker Registry: http://localhost:5000"
    echo "Nginx: http://localhost:80"
    
    echo -e "\n=== Container Logs ==="
    echo "To view Jenkins logs: docker logs jenkins"
    echo "To view registry logs: docker logs jenkins-registry"
    echo "To view nginx logs: docker logs jenkins-nginx"
}

# Stop Jenkins services
stop_jenkins() {
    log_info "Stopping Jenkins services..."
    
    cd "$SCRIPT_DIR"
    docker-compose -f docker-compose.jenkins.yml down
    
    log_success "Jenkins services stopped"
}

# Clean up Jenkins data
cleanup_jenkins() {
    log_info "Cleaning up Jenkins data..."
    
    cd "$SCRIPT_DIR"
    docker-compose -f docker-compose.jenkins.yml down -v
    
    log_success "Jenkins data cleaned up"
}

# Show help
show_help() {
    echo "E-commerce Platform Jenkins Startup Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     Start Jenkins services (default)"
    echo "  stop      Stop Jenkins services"
    echo "  restart   Restart Jenkins services"
    echo "  status    Show service status"
    echo "  cleanup   Stop services and remove all data"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start      # Start Jenkins"
    echo "  $0 stop       # Stop Jenkins"
    echo "  $0 status     # Show status"
    echo ""
    echo "After starting Jenkins:"
    echo "1. Open http://localhost:8080"
    echo "2. Use the admin password shown above"
    echo "3. Install suggested plugins"
    echo "4. Create admin user"
    echo "5. Configure credentials and pipeline"
}

# Main execution
main() {
    case "${1:-start}" in
        "start")
            check_prerequisites
            create_directories
            start_jenkins
            wait_for_jenkins
            get_admin_password
            show_status
            ;;
        "stop")
            stop_jenkins
            ;;
        "restart")
            stop_jenkins
            sleep 5
            start_jenkins
            wait_for_jenkins
            show_status
            ;;
        "status")
            show_status
            ;;
        "cleanup")
            cleanup_jenkins
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"

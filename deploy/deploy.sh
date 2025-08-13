#!/bin/bash

# E-commerce Platform Deployment Script
# Usage: ./deploy/deploy.sh [environment] [action]
# Example: ./deploy/deploy.sh dev deploy

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_CONFIG="${SCRIPT_DIR}/config.sh"

# Default values
ENVIRONMENT=${1:-"dev"}
ACTION=${2:-"deploy"}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Load deployment configuration
if [[ -f "$DEPLOY_CONFIG" ]]; then
    source "$DEPLOY_CONFIG"
    log_info "Loaded deployment configuration for $ENVIRONMENT"
else
    log_warning "No deployment config found, using defaults"
    # Default configuration
    declare -A DEPLOY_CONFIGS
    DEPLOY_CONFIGS["dev"]="localhost"
    DEPLOY_CONFIGS["staging"]="staging.example.com"
    DEPLOY_CONFIGS["prod"]="prod.example.com"
fi

# Validate environment
if [[ ! "${!DEPLOY_CONFIGS[@]}" =~ "$ENVIRONMENT" ]]; then
    log_error "Invalid environment: $ENVIRONMENT"
    log_error "Valid environments: ${!DEPLOY_CONFIGS[@]}"
    exit 1
fi

# Get target host
TARGET_HOST=${DEPLOY_CONFIGS[$ENVIRONMENT]}
if [[ -z "$TARGET_HOST" ]]; then
    log_error "No target host configured for environment: $ENVIRONMENT"
    exit 1
fi

log_info "Deploying to $ENVIRONMENT environment on $TARGET_HOST"

# Functions
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if docker-compose file exists
    if [[ ! -f "$PROJECT_ROOT/docker-compose.full.yml" ]]; then
        log_error "docker-compose.full.yml not found in $PROJECT_ROOT"
        exit 1
    fi
    
    # Check if we're in a git repository
    if [[ ! -d "$PROJECT_ROOT/.git" ]]; then
        log_warning "Not in a git repository, some features may not work"
    fi
    
    log_success "Prerequisites check passed"
}

backup_current_deployment() {
    if [[ "$ACTION" == "deploy" ]]; then
        log_info "Creating backup of current deployment..."
        
        # Create backup directory
        BACKUP_DIR="$PROJECT_ROOT/deploy/backups/${ENVIRONMENT}_${TIMESTAMP}"
        mkdir -p "$BACKUP_DIR"
        
        # Copy current docker-compose file
        if [[ -f "$PROJECT_ROOT/docker-compose.full.yml" ]]; then
            cp "$PROJECT_ROOT/docker-compose.full.yml" "$BACKUP_DIR/"
        fi
        
        # Copy environment-specific files
        if [[ -f "$PROJECT_ROOT/.env.${ENVIRONMENT}" ]]; then
            cp "$PROJECT_ROOT/.env.${ENVIRONMENT}" "$BACKUP_DIR/"
        fi
        
        log_success "Backup created in $BACKUP_DIR"
    fi
}

deploy_to_local() {
    log_info "Deploying to local environment..."
    
    cd "$PROJECT_ROOT"
    
    # Stop existing services
    log_info "Stopping existing services..."
    docker-compose -f docker-compose.full.yml down --remove-orphans || true
    
    # Pull latest images if using remote registry
    if [[ "$REGISTRY" != "localhost:5000" ]]; then
        log_info "Pulling latest images from $REGISTRY..."
        docker-compose -f docker-compose.full.yml pull || true
    fi
    
    # Start services
    log_info "Starting services..."
    docker-compose -f docker-compose.full.yml up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Health checks
    log_info "Running health checks..."
    if curl -f http://localhost:4000/healthz > /dev/null 2>&1; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
        exit 1
    fi
    
    if curl -f http://localhost:5173 > /dev/null 2>&1; then
        log_success "Frontend health check passed"
    else
        log_error "Frontend health check failed"
        exit 1
    fi
    
    log_success "Local deployment completed successfully"
}

deploy_to_remote() {
    log_info "Deploying to remote host: $TARGET_HOST"
    
    # Check if SSH key is available
    if [[ -z "$SSH_KEY_PATH" ]]; then
        log_warning "No SSH key configured, using default SSH authentication"
        SSH_OPTS=""
    else
        SSH_OPTS="-i $SSH_KEY_PATH"
    fi
    
    # Create deployment package
    log_info "Creating deployment package..."
    DEPLOY_PACKAGE="$PROJECT_ROOT/deploy/package_${ENVIRONMENT}_${TIMESTAMP}.tar.gz"
    
    cd "$PROJECT_ROOT"
    tar -czf "$DEPLOY_PACKAGE" \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='coverage' \
        --exclude='*.log' \
        --exclude='deploy/backups' \
        --exclude='deploy/package_*.tar.gz' \
        .
    
    # Upload to remote host
    log_info "Uploading deployment package to $TARGET_HOST..."
    scp $SSH_OPTS "$DEPLOY_PACKAGE" "$REMOTE_USER@$TARGET_HOST:/tmp/"
    
    # Execute deployment on remote host
    log_info "Executing deployment on remote host..."
    ssh $SSH_OPTS "$REMOTE_USER@$TARGET_HOST" << EOF
        set -e
        
        # Create deployment directory
        DEPLOY_DIR="/opt/ecommerce-platform/\${ENVIRONMENT}_\${TIMESTAMP}"
        mkdir -p "\$DEPLOY_DIR"
        
        # Extract deployment package
        cd "\$DEPLOY_DIR"
        tar -xzf "/tmp/package_${ENVIRONMENT}_${TIMESTAMP}.tar.gz"
        
        # Stop existing services
        if [[ -f "docker-compose.full.yml" ]]; then
            docker-compose -f docker-compose.full.yml down --remove-orphans || true
        fi
        
        # Start services
        docker-compose -f docker-compose.full.yml up -d
        
        # Wait for services
        sleep 30
        
        # Health checks
        if curl -f http://localhost:4000/healthz > /dev/null 2>&1; then
            echo "Backend health check passed"
        else
            echo "Backend health check failed"
            exit 1
        fi
        
        if curl -f http://localhost:5173 > /dev/null 2>&1; then
            echo "Frontend health check passed"
        else
            echo "Frontend health check failed"
            exit 1
        fi
        
        # Update symlink to current deployment
        CURRENT_LINK="/opt/ecommerce-platform/current"
        if [[ -L "\$CURRENT_LINK" ]]; then
            rm "\$CURRENT_LINK"
        fi
        ln -s "\$DEPLOY_DIR" "\$CURRENT_LINK"
        
        # Cleanup old deployments (keep last 5)
        cd /opt/ecommerce-platform
        ls -dt */ | tail -n +6 | xargs -r rm -rf
        
        # Cleanup uploaded package
        rm "/tmp/package_${ENVIRONMENT}_${TIMESTAMP}.tar.gz"
        
        echo "Remote deployment completed successfully"
EOF
    
    # Cleanup local package
    rm "$DEPLOY_PACKAGE"
    
    log_success "Remote deployment completed successfully"
}

rollback_deployment() {
    log_info "Rolling back deployment for $ENVIRONMENT..."
    
    if [[ "$TARGET_HOST" == "localhost" ]]; then
        log_info "Rolling back local deployment..."
        cd "$PROJECT_ROOT"
        
        # Stop current services
        docker-compose -f docker-compose.full.yml down --remove-orphans || true
        
        # Find latest backup
        LATEST_BACKUP=$(ls -dt "$PROJECT_ROOT/deploy/backups/${ENVIRONMENT}_"* | head -1)
        
        if [[ -n "$LATEST_BACKUP" ]]; then
            log_info "Restoring from backup: $LATEST_BACKUP"
            
            # Restore docker-compose file
            if [[ -f "$LATEST_BACKUP/docker-compose.full.yml" ]]; then
                cp "$LATEST_BACKUP/docker-compose.full.yml" "$PROJECT_ROOT/"
            fi
            
            # Restore environment file
            if [[ -f "$LATEST_BACKUP/.env.${ENVIRONMENT}" ]]; then
                cp "$LATEST_BACKUP/.env.${ENVIRONMENT}" "$PROJECT_ROOT/"
            fi
            
            # Start services
            docker-compose -f docker-compose.full.yml up -d
            log_success "Local rollback completed"
        else
            log_error "No backup found for rollback"
            exit 1
        fi
    else
        log_info "Rolling back remote deployment on $TARGET_HOST..."
        
        ssh $SSH_OPTS "$REMOTE_USER@$TARGET_HOST" << EOF
            # Find previous deployment
            PREVIOUS_DEPLOYMENT=\$(ls -dt /opt/ecommerce-platform/*/ | grep -v current | head -2 | tail -1)
            
            if [[ -n "\$PREVIOUS_DEPLOYMENT" ]]; then
                # Stop current services
                if [[ -L /opt/ecommerce-platform/current ]]; then
                    cd /opt/ecommerce-platform/current
                    docker-compose -f docker-compose.full.yml down --remove-orphans || true
                fi
                
                # Update symlink to previous deployment
                rm -f /opt/ecommerce-platform/current
                ln -s "\$PREVIOUS_DEPLOYMENT" /opt/ecommerce-platform/current
                
                # Start previous services
                cd /opt/ecommerce-platform/current
                docker-compose -f docker-compose.full.yml up -d
                
                echo "Remote rollback completed"
            else
                echo "No previous deployment found for rollback"
                exit 1
            fi
EOF
        
        log_success "Remote rollback completed"
    fi
}

show_status() {
    log_info "Showing deployment status for $ENVIRONMENT..."
    
    if [[ "$TARGET_HOST" == "localhost" ]]; then
        cd "$PROJECT_ROOT"
        
        echo "=== Docker Services Status ==="
        docker-compose -f docker-compose.full.yml ps
        
        echo -e "\n=== Service Health Checks ==="
        if curl -s http://localhost:4000/healthz > /dev/null 2>&1; then
            echo "✅ Backend: Healthy"
        else
            echo "❌ Backend: Unhealthy"
        fi
        
        if curl -s http://localhost:5173 > /dev/null 2>&1; then
            echo "✅ Frontend: Healthy"
        else
            echo "❌ Frontend: Unhealthy"
        fi
        
        echo -e "\n=== Recent Backups ==="
        ls -la "$PROJECT_ROOT/deploy/backups/${ENVIRONMENT}_"* 2>/dev/null | head -5 || echo "No backups found"
    else
        ssh $SSH_OPTS "$REMOTE_USER@$TARGET_HOST" << EOF
            echo "=== Current Deployment ==="
            if [[ -L /opt/ecommerce-platform/current ]]; then
                ls -la /opt/ecommerce-platform/current
            else
                echo "No current deployment"
            fi
            
            echo -e "\n=== Docker Services Status ==="
            if [[ -d /opt/ecommerce-platform/current ]]; then
                cd /opt/ecommerce-platform/current
                docker-compose -f docker-compose.full.yml ps
            fi
            
            echo -e "\n=== Recent Deployments ==="
            ls -la /opt/ecommerce-platform/ | grep -E "^d" | head -5
EOF
    fi
}

# Main execution
main() {
    log_info "Starting deployment process..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Action: $ACTION"
    log_info "Target Host: $TARGET_HOST"
    
    case "$ACTION" in
        "deploy")
            check_prerequisites
            backup_current_deployment
            
            if [[ "$TARGET_HOST" == "localhost" ]]; then
                deploy_to_local
            else
                deploy_to_remote
            fi
            ;;
        "rollback")
            rollback_deployment
            ;;
        "status")
            show_status
            ;;
        "backup")
            backup_current_deployment
            ;;
        *)
            log_error "Invalid action: $ACTION"
            log_error "Valid actions: deploy, rollback, status, backup"
            exit 1
            ;;
    esac
    
    log_success "Deployment process completed successfully"
}

# Run main function
main "$@"

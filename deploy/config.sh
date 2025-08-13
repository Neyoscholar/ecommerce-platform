#!/bin/bash

# E-commerce Platform Deployment Configuration
# This file contains environment-specific deployment settings

# Docker Registry Configuration
REGISTRY="localhost:5000"  # Change to your registry (e.g., ghcr.io, docker.io)
REGISTRY_USERNAME=""        # Registry username (if required)
REGISTRY_PASSWORD=""        # Registry password (if required)

# Remote Deployment Configuration
REMOTE_USER="deploy"        # SSH user for remote deployments
SSH_KEY_PATH=""             # Path to SSH private key for remote deployments

# Environment-specific configurations
declare -A DEPLOY_CONFIGS

# Development Environment (Local)
DEPLOY_CONFIGS["dev"]="localhost"

# Staging Environment
DEPLOY_CONFIGS["staging"]="staging.example.com"

# Production Environment
DEPLOY_CONFIGS["prod"]="prod.example.com"

# Environment-specific variables
declare -A ENV_VARS

# Development environment variables
ENV_VARS["dev"]="
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/ecommerce_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-key-change-in-production
PORT=4000
FRONTEND_URL=http://localhost:5173
"

# Staging environment variables
ENV_VARS["staging"]="
NODE_ENV=staging
DATABASE_URL=postgresql://postgres:password@staging-db:5432/ecommerce_staging
REDIS_URL=redis://staging-redis:6379
JWT_SECRET=staging-secret-key
PORT=4000
FRONTEND_URL=https://staging.example.com
"

# Production environment variables
ENV_VARS["prod"]="
NODE_ENV=production
DATABASE_URL=postgresql://postgres:password@prod-db:5432/ecommerce_prod
REDIS_URL=redis://prod-redis:6379
JWT_SECRET=production-secret-key-change-this
PORT=4000
FRONTEND_URL=https://example.com
"

# Docker Compose overrides for different environments
declare -A DOCKER_COMPOSE_OVERRIDES

# Development overrides
DOCKER_COMPOSE_OVERRIDES["dev"]="
version: '3.8'
services:
  backend:
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=debug
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: npm run dev
  
  frontend:
    environment:
      - NODE_ENV=development
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev
"

# Staging overrides
DOCKER_COMPOSE_OVERRIDES["staging"]="
version: '3.8'
services:
  backend:
    environment:
      - NODE_ENV=staging
      - LOG_LEVEL=info
    restart: unless-stopped
  
  frontend:
    environment:
      - NODE_ENV=staging
    restart: unless-stopped
"

# Production overrides
DOCKER_COMPOSE_OVERRIDES["prod"]="
version: '3.8'
services:
  backend:
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=warn
    restart: always
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
  
  frontend:
    environment:
      - NODE_ENV=production
    restart: always
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
"

# Health check configurations
declare -A HEALTH_CHECKS

HEALTH_CHECKS["dev"]="
  healthcheck:
    test: ['CMD', 'curl', '-f', 'http://localhost:4000/healthz']
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
"

HEALTH_CHECKS["staging"]="
  healthcheck:
    test: ['CMD', 'curl', '-f', 'http://localhost:4000/healthz']
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
"

HEALTH_CHECKS["prod"]="
  healthcheck:
    test: ['CMD', 'curl', '-f', 'http://localhost:4000/healthz']
    interval: 15s
    timeout: 5s
    retries: 5
    start_period: 60s
"

# Backup retention policies
declare -A BACKUP_RETENTION

BACKUP_RETENTION["dev"]="7"      # Keep 7 days of backups
BACKUP_RETENTION["staging"]="14" # Keep 14 days of backups
BACKUP_RETENTION["prod"]="30"    # Keep 30 days of backups

# Notification settings
NOTIFICATION_EMAIL="team@example.com"
SLACK_WEBHOOK_URL=""
TEAMS_WEBHOOK_URL=""

# Load balancing configuration (for production)
LOAD_BALANCER_CONFIG="
  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    restart: always
"

# Monitoring configuration
MONITORING_CONFIG="
  prometheus:
    image: prom/prometheus:latest
    ports:
      - '9090:9090'
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: always
  
  grafana:
    image: grafana/grafana:latest
    ports:
      - '3000:3000'
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    restart: always
"

# Export variables for use in other scripts
export REGISTRY
export REGISTRY_USERNAME
export REGISTRY_PASSWORD
export REMOTE_USER
export SSH_KEY_PATH
export DEPLOY_CONFIGS
export ENV_VARS
export DOCKER_COMPOSE_OVERRIDES
export HEALTH_CHECKS
export BACKUP_RETENTION
export NOTIFICATION_EMAIL
export SLACK_WEBHOOK_URL
export TEAMS_WEBHOOK_URL
export LOAD_BALANCER_CONFIG
export MONITORING_CONFIG

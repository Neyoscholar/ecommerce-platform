#!/bin/bash

# Start Full E-Commerce Monitoring Stack
echo "🚀 Starting E-Commerce Platform with Full Monitoring Stack"
echo "=========================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if ports are available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $port is already in use. Please free it up first."
        return 1
    fi
    return 0
}

echo "🔍 Checking port availability..."
required_ports=(3000 4000 5173 8080 9090 9100 9121 9187)

for port in "${required_ports[@]}"; do
    if ! check_port $port; then
        echo "❌ Cannot proceed. Please free up port $port first."
        exit 1
    fi
done

echo "✅ All required ports are available"

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker-compose -f docker-compose.full.yml down 2>/dev/null || true

# Start the full stack
echo "🚀 Starting full monitoring stack..."
docker-compose -f docker-compose.full.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "🔍 Checking service status..."
docker-compose -f docker-compose.full.yml ps

# Health checks
echo "🏥 Performing health checks..."

# Backend health
echo "   Backend API..."
if curl -s http://localhost:4000/healthz > /dev/null; then
    echo "   ✅ Backend API is healthy"
else
    echo "   ❌ Backend API health check failed"
fi

# Prometheus health
echo "   Prometheus..."
if curl -s http://localhost:9090/-/healthy > /dev/null; then
    echo "   ✅ Prometheus is healthy"
else
    echo "   ❌ Prometheus health check failed"
fi

# Grafana health
echo "   Grafana..."
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "   ✅ Grafana is healthy"
else
    echo "   ❌ Grafana health check failed"
fi

# Frontend health
echo "   Frontend..."
if curl -s http://localhost:5173 > /dev/null; then
    echo "   ✅ Frontend is healthy"
else
    echo "   ❌ Frontend health check failed"
fi

echo ""
echo "🎉 Monitoring Stack Started Successfully!"
echo ""
echo "📱 Service URLs:"
echo "   Frontend:        http://localhost:5173"
echo "   Backend API:     http://localhost:4000"
echo "   Grafana:         http://localhost:3000 (admin/admin)"
echo "   Prometheus:      http://localhost:9090"
echo "   cAdvisor:        http://localhost:8080"
echo ""
echo "🔍 Monitoring Endpoints:"
echo "   Health Check:    http://localhost:4000/healthz"
echo "   Metrics:         http://localhost:4000/metrics"
echo "   Cache Health:    http://localhost:4000/cache/healthz"
echo "   Cache Stats:     http://localhost:4000/cache/stats"
echo ""
echo "📊 Quick Start:"
echo "   1. Open Grafana: http://localhost:3000"
echo "   2. Login: admin/admin"
echo "   3. View Dashboard: E-Commerce Overview"
echo "   4. Generate metrics by using the API"
echo ""
echo "🧪 Test the System:"
echo "   curl http://localhost:4000/api/products?limit=5"
echo "   curl http://localhost:4000/metrics | head -20"
echo ""
echo "🛑 To stop all services:"
echo "   docker-compose -f docker-compose.full.yml down"
echo ""
echo "📋 To view logs:"
echo "   docker-compose -f docker-compose.full.yml logs -f [service-name]"
echo ""
echo "🎯 Your enterprise-grade monitoring system is ready! 🚀"

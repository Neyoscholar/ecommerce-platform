# 📊 Monitoring System - Prometheus & Grafana

## Overview
This system implements comprehensive monitoring for the e-commerce platform using Prometheus for metrics collection and Grafana for visualization. It provides real-time insights into application performance, system health, and business metrics.

## 🏗️ Architecture

### Components
- **Prometheus**: Metrics collection and storage
- **Grafana**: Metrics visualization and dashboards
- **Node Exporter**: System-level metrics
- **Redis Exporter**: Cache performance metrics
- **PostgreSQL Exporter**: Database performance metrics
- **cAdvisor**: Container metrics
- **Custom Metrics**: Application-specific business metrics

### Data Flow
```
Application → Prometheus → Grafana
    ↓              ↓         ↓
Custom Metrics  Storage   Dashboards
```

## 🚀 Features

### ✅ **Application Metrics**
- HTTP request rate and response times
- Database query performance
- Cache hit/miss ratios
- Error rates and types
- Business metrics (orders, products, users)

### ✅ **System Metrics**
- CPU and memory usage
- Disk I/O and network
- Container resource usage
- Database connections
- Redis performance

### ✅ **Business Intelligence**
- Order creation rates
- Product view analytics
- User registration trends
- Revenue tracking
- Performance trends

## 🔧 Setup & Installation

### Prerequisites
1. **Docker & Docker Compose** installed
2. **Ports available**: 3000, 4000, 5173, 8080, 9090, 9100, 9121, 9187

### Quick Start
```bash
# Start the full monitoring stack
docker-compose -f docker-compose.full.yml up -d

# Check all services are running
docker-compose -f docker-compose.full.yml ps
```

### Service URLs
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **cAdvisor**: http://localhost:8080

## 📊 Metrics Collection

### Custom Application Metrics
The backend exposes comprehensive metrics at `/metrics`:

```typescript
// HTTP Request Metrics
http_request_duration_seconds
http_requests_total
http_requests_in_progress

// Database Metrics
db_query_duration_seconds
db_queries_total
db_connections_active

// Cache Metrics
cache_hits_total
cache_misses_total
cache_operation_duration_seconds

// Business Metrics
orders_created_total
products_viewed_total
user_registrations_total
total_revenue_dollars

// System Metrics
system_uptime_seconds
system_memory_bytes
system_cpu_usage_percent
```

### Metrics Endpoints
- **Prometheus Format**: `/metrics`
- **Health Check**: `/healthz`
- **Enhanced Health**: `/healthz/metrics`
- **Application Info**: `/info`

## 🎯 Grafana Dashboards

### E-Commerce Overview Dashboard
The main dashboard includes:

1. **Performance Metrics**
   - HTTP request rate
   - Response time (95th percentile)
   - Cache hit/miss rates
   - Database query performance

2. **Business Metrics**
   - Orders created per minute
   - Products viewed per minute
   - User registrations
   - Total revenue

3. **System Health**
   - Memory usage
   - System uptime
   - Total products/orders
   - Error rates

### Dashboard Features
- **Real-time updates** (5-second refresh)
- **Interactive graphs** with zoom and pan
- **Threshold alerts** for critical metrics
- **Responsive design** for all screen sizes

## 🔍 Monitoring & Alerting

### Key Performance Indicators (KPIs)
- **Response Time**: < 200ms (95th percentile)
- **Error Rate**: < 1% of total requests
- **Cache Hit Ratio**: > 80%
- **Database Query Time**: < 100ms average

### Alerting Rules
```yaml
# High error rate
- alert: HighErrorRate
  expr: rate(errors_total[5m]) > 0.01
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "High error rate detected"

# High response time
- alert: HighResponseTime
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "Response time above threshold"
```

## 🧪 Testing the System

### Generate Load
```bash
# Test API endpoints to generate metrics
curl "http://localhost:4000/api/products?limit=10"
curl "http://localhost:4000/api/products?limit=10"  # Cache hit
curl "http://localhost:4000/healthz"
curl "http://localhost:4000/metrics"
```

### Verify Metrics
```bash
# Check Prometheus targets
curl "http://localhost:9090/api/v1/targets"

# Query specific metrics
curl "http://localhost:9090/api/v1/query?query=http_requests_total"

# Check Grafana datasource
curl "http://localhost:3000/api/datasources"
```

## 🔧 Configuration

### Prometheus Configuration
- **Scrape Interval**: 15 seconds
- **Retention**: 200 hours
- **Storage**: 10GB limit
- **Targets**: All services with health checks

### Grafana Configuration
- **Admin User**: admin/admin
- **Auto-provisioning**: Dashboards and datasources
- **Plugins**: Pie chart, world map
- **Security**: Sign-up disabled

### Nginx Configuration
- **Rate Limiting**: API (10 req/s), Static (100 req/s)
- **Security Headers**: XSS protection, frame options
- **Gzip Compression**: Enabled for all text types
- **Proxy**: Backend API and monitoring endpoints

## 🚨 Troubleshooting

### Common Issues

#### Prometheus Not Scraping
```bash
# Check targets status
curl "http://localhost:9090/api/v1/targets"

# Verify service health
curl "http://localhost:4000/healthz"
curl "http://localhost:4000/metrics"
```

#### Grafana No Data
```bash
# Check datasource connection
curl "http://localhost:3000/api/datasources"

# Verify Prometheus is accessible
curl "http://localhost:9090/api/v1/query?query=up"
```

#### Metrics Not Appearing
```bash
# Check application logs
docker logs ecommerce-backend

# Verify metrics endpoint
curl "http://localhost:4000/metrics" | head -20
```

### Debug Commands
```bash
# Check all container statuses
docker-compose -f docker-compose.full.yml ps

# View logs for specific service
docker logs ecommerce-prometheus
docker logs ecommerce-grafana

# Access container shell
docker exec -it ecommerce-backend sh
```

## 📈 Advanced Features

### Custom Metrics
The system automatically tracks:
- **Business Events**: Orders, products, users
- **Performance**: Response times, cache efficiency
- **Errors**: Types, components, severity
- **Resources**: Memory, CPU, connections

### Metrics Aggregation
- **Rate calculations** for trends
- **Histogram quantiles** for percentiles
- **Label-based filtering** for analysis
- **Time-series aggregation** for reporting

### Exporters
- **Node Exporter**: Host system metrics
- **Redis Exporter**: Cache performance
- **PostgreSQL Exporter**: Database metrics
- **cAdvisor**: Container resource usage

## 🔮 Future Enhancements

### Planned Features
1. **AlertManager**: Advanced alerting and notifications
2. **Long-term Storage**: Thanos or Cortex integration
3. **Custom Dashboards**: Role-based access
4. **API Analytics**: Detailed request analysis
5. **Business Intelligence**: Advanced reporting

### Integration Ideas
1. **Slack/Teams**: Alert notifications
2. **Email**: Daily/weekly reports
3. **Webhooks**: Custom integrations
4. **External Monitoring**: Uptime monitoring
5. **Log Aggregation**: ELK stack integration

## 🎯 Best Practices

### Monitoring Strategy
- **Golden Signals**: Latency, traffic, errors, saturation
- **SLOs/SLIs**: Service level objectives and indicators
- **Alert Fatigue**: Avoid too many alerts
- **Documentation**: Document all metrics and dashboards

### Performance Optimization
- **Scrape Intervals**: Balance detail vs. resource usage
- **Metric Cardinality**: Limit label combinations
- **Storage Retention**: Align with business needs
- **Query Optimization**: Use recording rules for complex queries

## 🎉 Quick Start Summary

1. **Start Stack**: `docker-compose -f docker-compose.full.yml up -d`
2. **Access Grafana**: http://localhost:3000 (admin/admin)
3. **View Dashboard**: E-Commerce Overview
4. **Generate Metrics**: Make API requests
5. **Monitor Performance**: Real-time dashboards

**Your comprehensive monitoring system is now ready!** 📊

The system provides:
- **Real-time visibility** into application performance
- **Business intelligence** for decision making
- **Proactive alerting** for issues
- **Historical analysis** for trends
- **Professional dashboards** for stakeholders

Monitor your e-commerce platform with enterprise-grade observability! 🚀

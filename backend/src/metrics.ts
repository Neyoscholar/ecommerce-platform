import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Enable default metrics collection (CPU, memory, etc.)
collectDefaultMetrics({ register });

// HTTP Request Metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestInProgress = new Gauge({
  name: 'http_requests_in_progress',
  help: 'Number of HTTP requests currently in progress',
  labelNames: ['method', 'route'],
});

// Database Metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

export const dbQueryTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status'],
});

export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
});

export const dbConnectionsTotal = new Counter({
  name: 'db_connections_total',
  help: 'Total number of database connections',
  labelNames: ['status'],
});

// Cache Metrics
export const cacheHitTotal = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
});

export const cacheMissTotal = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
});

export const cacheOperationDuration = new Histogram({
  name: 'cache_operation_duration_seconds',
  help: 'Duration of cache operations in seconds',
  labelNames: ['operation', 'cache_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

export const cacheKeysTotal = new Gauge({
  name: 'cache_keys_total',
  help: 'Total number of keys in cache',
  labelNames: ['cache_type'],
});

export const cacheMemoryUsage = new Gauge({
  name: 'cache_memory_bytes',
  help: 'Memory usage of cache in bytes',
  labelNames: ['cache_type'],
});

// Business Logic Metrics
export const ordersCreatedTotal = new Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
  labelNames: ['status'],
});

export const productsViewedTotal = new Counter({
  name: 'products_viewed_total',
  help: 'Total number of product views',
  labelNames: ['product_id', 'category_id'],
});

export const userRegistrationsTotal = new Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['status'],
});

export const userLoginsTotal = new Counter({
  name: 'user_logins_total',
  help: 'Total number of user logins',
  labelNames: ['status'],
});

// System Metrics
export const systemUptime = new Gauge({
  name: 'system_uptime_seconds',
  help: 'System uptime in seconds',
});

export const systemMemoryUsage = new Gauge({
  name: 'system_memory_bytes',
  help: 'System memory usage in bytes',
  labelNames: ['type'],
});

export const systemCpuUsage = new Gauge({
  name: 'system_cpu_usage_percent',
  help: 'System CPU usage percentage',
});

// Error Metrics
export const errorsTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'component', 'severity'],
});

export const errorRate = new Gauge({
  name: 'error_rate_per_second',
  help: 'Error rate per second',
  labelNames: ['type', 'component'],
});

// Custom Metrics
export const activeUsers = new Gauge({
  name: 'active_users_total',
  help: 'Number of currently active users',
});

export const totalProducts = new Gauge({
  name: 'total_products',
  help: 'Total number of products in the system',
});

export const totalOrders = new Gauge({
  name: 'total_orders',
  help: 'Total number of orders in the system',
});

export const totalUsers = new Gauge({
  name: 'total_users',
  help: 'Total number of users in the system',
});

export const totalRevenue = new Gauge({
  name: 'total_revenue_dollars',
  help: 'Total revenue in dollars',
});

// Metrics Collection Functions
export function recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
  const labels = { method, route, status_code: statusCode.toString() };
  
  httpRequestDuration.observe(labels, duration);
  httpRequestTotal.inc(labels);
}

export function recordDbQuery(operation: string, table: string, duration: number, status: 'success' | 'error') {
  const labels = { operation, table, status };
  
  dbQueryDuration.observe(labels, duration);
  dbQueryTotal.inc(labels);
}

export function recordCacheOperation(operation: 'hit' | 'miss' | 'set' | 'delete', cacheType: string, duration?: number) {
  if (operation === 'hit') {
    cacheHitTotal.inc({ cache_type: cacheType });
  } else if (operation === 'miss') {
    cacheMissTotal.inc({ cache_type: cacheType });
  }
  
  if (duration !== undefined) {
    cacheOperationDuration.observe({ operation, cache_type: cacheType }, duration);
  }
}

export function recordOrderCreated(status: string) {
  ordersCreatedTotal.inc({ status });
}

export function recordProductViewed(productId: number, categoryId?: number) {
  productsViewedTotal.inc({ 
    product_id: productId.toString(), 
    category_id: categoryId?.toString() || 'none' 
  });
}

export function recordUserRegistration(status: 'success' | 'error') {
  userRegistrationsTotal.inc({ status });
}

export function recordUserLogin(status: 'success' | 'error') {
  userLoginsTotal.inc({ status });
}

export function recordError(type: string, component: string, severity: 'low' | 'medium' | 'high' | 'critical') {
  errorsTotal.inc({ type, component, severity });
}

export function updateSystemMetrics() {
  // Update system uptime
  systemUptime.set(process.uptime());
  
  // Update memory usage
  const memUsage = process.memoryUsage();
  systemMemoryUsage.set({ type: 'rss' }, memUsage.rss);
  systemMemoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
  systemMemoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
  systemMemoryUsage.set({ type: 'external' }, memUsage.external);
}

// Metrics endpoint handler
export async function getMetrics(): Promise<string> {
  try {
    return await register.metrics();
  } catch (error) {
    console.error('Error generating metrics:', error);
    throw error;
  }
}

// Health check with metrics
export async function getHealthWithMetrics(): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Basic health check
    const health = {
      ok: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
    
    // Add metrics summary
    const metrics = {
      http_requests: await httpRequestTotal.get(),
      db_queries: await dbQueryTotal.get(),
      cache_hits: await cacheHitTotal.get(),
      cache_misses: await cacheMissTotal.get(),
      orders_created: await ordersCreatedTotal.get(),
      errors: await errorsTotal.get(),
    };
    
    const responseTime = Date.now() - startTime;
    
    return {
      ...health,
      metrics,
      response_time_ms: responseTime,
    };
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      ok: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      response_time_ms: Date.now() - startTime,
    };
  }
}

// Initialize system metrics
updateSystemMetrics();

// Update system metrics every 30 seconds (only in production)
if (process.env.NODE_ENV !== 'test') {
  setInterval(updateSystemMetrics, 30000);
}

export default register;

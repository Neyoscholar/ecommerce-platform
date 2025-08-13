"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.totalRevenue = exports.totalUsers = exports.totalOrders = exports.totalProducts = exports.activeUsers = exports.errorRate = exports.errorsTotal = exports.systemCpuUsage = exports.systemMemoryUsage = exports.systemUptime = exports.userLoginsTotal = exports.userRegistrationsTotal = exports.productsViewedTotal = exports.ordersCreatedTotal = exports.cacheMemoryUsage = exports.cacheKeysTotal = exports.cacheOperationDuration = exports.cacheMissTotal = exports.cacheHitTotal = exports.dbConnectionsTotal = exports.dbConnectionsActive = exports.dbQueryTotal = exports.dbQueryDuration = exports.httpRequestInProgress = exports.httpRequestTotal = exports.httpRequestDuration = void 0;
exports.recordHttpRequest = recordHttpRequest;
exports.recordDbQuery = recordDbQuery;
exports.recordCacheOperation = recordCacheOperation;
exports.recordOrderCreated = recordOrderCreated;
exports.recordProductViewed = recordProductViewed;
exports.recordUserRegistration = recordUserRegistration;
exports.recordUserLogin = recordUserLogin;
exports.recordError = recordError;
exports.updateSystemMetrics = updateSystemMetrics;
exports.getMetrics = getMetrics;
exports.getHealthWithMetrics = getHealthWithMetrics;
const prom_client_1 = require("prom-client");
// Enable default metrics collection (CPU, memory, etc.)
(0, prom_client_1.collectDefaultMetrics)({ register: prom_client_1.register });
// HTTP Request Metrics
exports.httpRequestDuration = new prom_client_1.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});
exports.httpRequestTotal = new prom_client_1.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
});
exports.httpRequestInProgress = new prom_client_1.Gauge({
    name: 'http_requests_in_progress',
    help: 'Number of HTTP requests currently in progress',
    labelNames: ['method', 'route'],
});
// Database Metrics
exports.dbQueryDuration = new prom_client_1.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});
exports.dbQueryTotal = new prom_client_1.Counter({
    name: 'db_queries_total',
    help: 'Total number of database queries',
    labelNames: ['operation', 'table', 'status'],
});
exports.dbConnectionsActive = new prom_client_1.Gauge({
    name: 'db_connections_active',
    help: 'Number of active database connections',
});
exports.dbConnectionsTotal = new prom_client_1.Counter({
    name: 'db_connections_total',
    help: 'Total number of database connections',
    labelNames: ['status'],
});
// Cache Metrics
exports.cacheHitTotal = new prom_client_1.Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type'],
});
exports.cacheMissTotal = new prom_client_1.Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type'],
});
exports.cacheOperationDuration = new prom_client_1.Histogram({
    name: 'cache_operation_duration_seconds',
    help: 'Duration of cache operations in seconds',
    labelNames: ['operation', 'cache_type'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});
exports.cacheKeysTotal = new prom_client_1.Gauge({
    name: 'cache_keys_total',
    help: 'Total number of keys in cache',
    labelNames: ['cache_type'],
});
exports.cacheMemoryUsage = new prom_client_1.Gauge({
    name: 'cache_memory_bytes',
    help: 'Memory usage of cache in bytes',
    labelNames: ['cache_type'],
});
// Business Logic Metrics
exports.ordersCreatedTotal = new prom_client_1.Counter({
    name: 'orders_created_total',
    help: 'Total number of orders created',
    labelNames: ['status'],
});
exports.productsViewedTotal = new prom_client_1.Counter({
    name: 'products_viewed_total',
    help: 'Total number of product views',
    labelNames: ['product_id', 'category_id'],
});
exports.userRegistrationsTotal = new prom_client_1.Counter({
    name: 'user_registrations_total',
    help: 'Total number of user registrations',
    labelNames: ['status'],
});
exports.userLoginsTotal = new prom_client_1.Counter({
    name: 'user_logins_total',
    help: 'Total number of user logins',
    labelNames: ['status'],
});
// System Metrics
exports.systemUptime = new prom_client_1.Gauge({
    name: 'system_uptime_seconds',
    help: 'System uptime in seconds',
});
exports.systemMemoryUsage = new prom_client_1.Gauge({
    name: 'system_memory_bytes',
    help: 'System memory usage in bytes',
    labelNames: ['type'],
});
exports.systemCpuUsage = new prom_client_1.Gauge({
    name: 'system_cpu_usage_percent',
    help: 'System CPU usage percentage',
});
// Error Metrics
exports.errorsTotal = new prom_client_1.Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'component', 'severity'],
});
exports.errorRate = new prom_client_1.Gauge({
    name: 'error_rate_per_second',
    help: 'Error rate per second',
    labelNames: ['type', 'component'],
});
// Custom Metrics
exports.activeUsers = new prom_client_1.Gauge({
    name: 'active_users_total',
    help: 'Number of currently active users',
});
exports.totalProducts = new prom_client_1.Gauge({
    name: 'total_products',
    help: 'Total number of products in the system',
});
exports.totalOrders = new prom_client_1.Gauge({
    name: 'total_orders',
    help: 'Total number of orders in the system',
});
exports.totalUsers = new prom_client_1.Gauge({
    name: 'total_users',
    help: 'Total number of users in the system',
});
exports.totalRevenue = new prom_client_1.Gauge({
    name: 'total_revenue_dollars',
    help: 'Total revenue in dollars',
});
// Metrics Collection Functions
function recordHttpRequest(method, route, statusCode, duration) {
    const labels = { method, route, status_code: statusCode.toString() };
    exports.httpRequestDuration.observe(labels, duration);
    exports.httpRequestTotal.inc(labels);
}
function recordDbQuery(operation, table, duration, status) {
    const labels = { operation, table, status };
    exports.dbQueryDuration.observe(labels, duration);
    exports.dbQueryTotal.inc(labels);
}
function recordCacheOperation(operation, cacheType, duration) {
    if (operation === 'hit') {
        exports.cacheHitTotal.inc({ cache_type: cacheType });
    }
    else if (operation === 'miss') {
        exports.cacheMissTotal.inc({ cache_type: cacheType });
    }
    if (duration !== undefined) {
        exports.cacheOperationDuration.observe({ operation, cache_type: cacheType }, duration);
    }
}
function recordOrderCreated(status) {
    exports.ordersCreatedTotal.inc({ status });
}
function recordProductViewed(productId, categoryId) {
    exports.productsViewedTotal.inc({
        product_id: productId.toString(),
        category_id: categoryId?.toString() || 'none'
    });
}
function recordUserRegistration(status) {
    exports.userRegistrationsTotal.inc({ status });
}
function recordUserLogin(status) {
    exports.userLoginsTotal.inc({ status });
}
function recordError(type, component, severity) {
    exports.errorsTotal.inc({ type, component, severity });
}
function updateSystemMetrics() {
    // Update system uptime
    exports.systemUptime.set(process.uptime());
    // Update memory usage
    const memUsage = process.memoryUsage();
    exports.systemMemoryUsage.set({ type: 'rss' }, memUsage.rss);
    exports.systemMemoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
    exports.systemMemoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
    exports.systemMemoryUsage.set({ type: 'external' }, memUsage.external);
}
// Metrics endpoint handler
async function getMetrics() {
    try {
        return await prom_client_1.register.metrics();
    }
    catch (error) {
        console.error('Error generating metrics:', error);
        throw error;
    }
}
// Health check with metrics
async function getHealthWithMetrics() {
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
            http_requests: await exports.httpRequestTotal.get(),
            db_queries: await exports.dbQueryTotal.get(),
            cache_hits: await exports.cacheHitTotal.get(),
            cache_misses: await exports.cacheMissTotal.get(),
            orders_created: await exports.ordersCreatedTotal.get(),
            errors: await exports.errorsTotal.get(),
        };
        const responseTime = Date.now() - startTime;
        return {
            ...health,
            metrics,
            response_time_ms: responseTime,
        };
    }
    catch (error) {
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
// Update system metrics every 30 seconds
setInterval(updateSystemMetrics, 30000);
exports.default = prom_client_1.register;

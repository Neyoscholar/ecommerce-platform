"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const db_1 = require("./db");
const cache_1 = __importDefault(require("./services/cache"));
const metrics_1 = require("./metrics");
const metrics_2 = __importDefault(require("./metrics"));
const auth_1 = __importDefault(require("./routes/auth"));
const products_1 = __importDefault(require("./routes/products"));
const orders_1 = __importDefault(require("./routes/orders"));
const admin_1 = __importDefault(require("./routes/admin"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
// Allow localhost/127.0.0.1 on any port (5173, 5174, etc.) during dev
app.use((0, cors_1.default)({
    origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
    credentials: true,
}));
app.use(express_1.default.json());
// Metrics middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    // Record request start
    res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000; // Convert to seconds
        const route = req.route?.path || req.path || 'unknown';
        // Record HTTP request metrics
        (0, metrics_1.recordHttpRequest)(req.method, route, res.statusCode, duration);
    });
    next();
});
// Health check with useful error output while debugging
app.get("/healthz", async (_req, res) => {
    try {
        await (0, db_1.healthDb)();
        res.json({ ok: true });
    }
    catch (e) {
        console.error("healthz failed:", e);
        res.status(500).json({ ok: false, error: e?.message ?? "unknown" });
    }
});
// Enhanced health check with metrics
app.get("/healthz/metrics", async (_req, res) => {
    try {
        const healthWithMetrics = await (0, metrics_1.getHealthWithMetrics)();
        res.json(healthWithMetrics);
    }
    catch (e) {
        console.error("healthz/metrics failed:", e);
        res.status(500).json({
            ok: false,
            error: e?.message ?? "unknown",
            timestamp: new Date().toISOString()
        });
    }
});
// Cache health check
app.get("/cache/healthz", async (_req, res) => {
    try {
        const isHealthy = await cache_1.default.healthCheck();
        if (isHealthy) {
            res.json({
                ok: true,
                service: "Redis Cache",
                status: "Connected"
            });
        }
        else {
            res.status(503).json({
                ok: false,
                service: "Redis Cache",
                status: "Disconnected"
            });
        }
    }
    catch (e) {
        console.error("cache healthz failed:", e);
        res.status(503).json({
            ok: false,
            service: "Redis Cache",
            status: "Error",
            error: e?.message ?? "unknown"
        });
    }
});
// Cache statistics
app.get("/cache/stats", async (_req, res) => {
    try {
        const stats = await cache_1.default.getStats();
        res.json({
            ok: true,
            service: "Redis Cache",
            stats
        });
    }
    catch (e) {
        console.error("cache stats failed:", e);
        res.status(500).json({
            ok: false,
            service: "Redis Cache",
            error: e?.message ?? "unknown"
        });
    }
});
// Prometheus metrics endpoint
app.get("/metrics", async (_req, res) => {
    try {
        res.set('Content-Type', metrics_2.default.contentType);
        const metrics = await (0, metrics_1.getMetrics)();
        res.end(metrics);
    }
    catch (e) {
        console.error("metrics endpoint failed:", e);
        res.status(500).json({
            error: "Failed to generate metrics",
            message: e?.message ?? "unknown"
        });
    }
});
// Application info endpoint
app.get("/info", (_req, res) => {
    res.json({
        name: "E-Commerce Platform API",
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        endpoints: {
            health: "/healthz",
            "health-with-metrics": "/healthz/metrics",
            metrics: "/metrics",
            cache: {
                health: "/cache/healthz",
                stats: "/cache/stats"
            },
            api: {
                auth: "/api/auth",
                products: "/api/products",
                orders: "/api/orders",
                admin: "/api/admin"
            }
        }
    });
});
app.use("/api/auth", auth_1.default);
app.use("/api/products", products_1.default);
app.use("/api/orders", orders_1.default);
app.use("/api/admin", admin_1.default);
// Central error handler with metrics
app.use((err, req, res, _next) => {
    console.error(err);
    // Record error metrics
    const errorType = err.name || 'UnknownError';
    const component = req.route?.path || req.path || 'unknown';
    const severity = err.status >= 500 ? 'high' : 'medium';
    (0, metrics_1.recordError)(errorType, component, severity);
    res.status(err?.status || 500).json({
        message: err?.message || "Server error",
        timestamp: new Date().toISOString()
    });
});
exports.default = app;

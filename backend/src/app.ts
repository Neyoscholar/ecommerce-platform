import express from "express";
import cors from "cors";
import helmet from "helmet";
import { healthDb } from "./db";
import cacheService from "./services/cache";
import { 
  getMetrics, 
  getHealthWithMetrics, 
  recordHttpRequest,
  recordError
} from "./metrics";
import register from "./metrics";
import authRouter from "./routes/auth";
import productsRouter from "./routes/products";
import ordersRouter from "./routes/orders";
import adminRouter from "./routes/admin";

const app = express();

// Temporarily disabled helmet for development debugging
// app.use(helmet());

// Allow localhost/127.0.0.1 on any port (5173, 5174, etc.) during dev
app.use(
  cors({
    origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
    credentials: true,
  })
);

app.use(express.json());

// Metrics middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Record request start
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    const route = req.route?.path || req.path || 'unknown';
    
    // Record HTTP request metrics
    recordHttpRequest(req.method, route, res.statusCode, duration);
  });
  
  next();
});

// Health check with useful error output while debugging
app.get("/healthz", async (_req, res) => {
  try {
    await healthDb();
    res.json({ ok: true });
  } catch (e: any) {
    console.error("healthz failed:", e);
    res.status(500).json({ ok: false, error: e?.message ?? "unknown" });
  }
});

// Enhanced health check with metrics
app.get("/healthz/metrics", async (_req, res) => {
  try {
    const healthWithMetrics = await getHealthWithMetrics();
    res.json(healthWithMetrics);
  } catch (e: any) {
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
    const isHealthy = await cacheService.healthCheck();
    if (isHealthy) {
      res.json({ 
        ok: true, 
        service: "Redis Cache",
        status: "Connected"
      });
    } else {
      res.status(503).json({ 
        ok: false, 
        service: "Redis Cache",
        status: "Disconnected"
      });
    }
  } catch (e: any) {
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
    const stats = await cacheService.getStats();
    res.json({ 
      ok: true, 
      service: "Redis Cache",
      stats 
    });
  } catch (e: any) {
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
    res.set('Content-Type', register.contentType);
    const metrics = await getMetrics();
    res.end(metrics);
  } catch (e: any) {
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

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRouter);

// Central error handler with metrics
app.use((
  err: any,
  req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) => {
  console.error('Global error handler caught:', err);
  console.error('Request details:', {
    method: req.method,
    path: req.path,
    route: req.route?.path,
    body: req.body,
    user: (req as any).user
  });
  
  // Record error metrics
  const errorType = err.name || 'UnknownError';
  const component = req.route?.path || req.path || 'unknown';
  const severity = err.status >= 500 ? 'high' : 'medium';
  
  recordError(errorType, component, severity);
  
  res.status(err?.status || 500).json({ 
    message: err?.message || "Server error",
    error: process.env.NODE_ENV === 'development' ? {
      type: errorType,
      component: component,
      details: err.message,
      stack: err.stack
    } : undefined,
    timestamp: new Date().toISOString()
  });
});

export default app;

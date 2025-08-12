import express from "express";
import cors from "cors";
import helmet from "helmet";
import { healthDb } from "./db";
import authRouter from "./routes/auth";
import productsRouter from "./routes/products";

const app = express();

app.use(helmet());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

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

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);

// Central error handler
app.use((
  err: any,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) => {
  console.error(err);
  res.status(err?.status || 500).json({ message: err?.message || "Server error" });
});

export default app;

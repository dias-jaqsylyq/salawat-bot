import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { config } from "../config.js";
import { telegramAuth } from "./authMiddleware.js";
import { registerRoute } from "./routes/register.js";
import { logRoute } from "./routes/log.js";
import { progressRoute } from "./routes/progress.js";
import { leaderboardRoute } from "./routes/leaderboard.js";
import { exportRoute } from "./routes/export.js";

export function createApiServer() {
  const app = express();

  const origin = config.corsOrigin === "*" ? "*" : config.corsOrigin.split(",").map((o) => o.trim());
  app.use(cors({ origin }));
  app.use(express.json({ limit: "16kb" }));

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get("/api/admin/export", exportRoute);

  app.post("/api/register", telegramAuth, registerRoute);
  app.post("/api/log", telegramAuth, logRoute);
  app.get("/api/progress", telegramAuth, progressRoute);
  app.get("/api/leaderboard", telegramAuth, leaderboardRoute);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: "not_found" });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("API error:", err);
    res.status(500).json({ success: false, error: "internal_error" });
  });

  return app;
}

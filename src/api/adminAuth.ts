import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";

export function isAdminTelegramId(telegramId: number): boolean {
  return config.adminTelegramId !== null && telegramId === config.adminTelegramId;
}

/** Must run after telegramAuth has populated req.telegramId. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!isAdminTelegramId(req.telegramId)) {
    res.status(403).json({ success: false, error: "not_admin" });
    return;
  }
  next();
}

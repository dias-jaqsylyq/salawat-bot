import type { Request, Response } from "express";
import { config } from "../../config.js";
import { getExportRows } from "../../db/repository.js";

/**
 * Prize-time CSV export. Auth: ?key= or X-Admin-Key header matching ADMIN_EXPORT_SECRET.
 * Not Telegram-auth'd — keep the secret off shared machines.
 */
export function exportRoute(req: Request, res: Response) {
  const secret = config.adminExportSecret;
  if (!secret) {
    res.status(503).json({ success: false, error: "export_disabled" });
    return;
  }

  const provided =
    (typeof req.query.key === "string" ? req.query.key : undefined) ??
    req.header("X-Admin-Key") ??
    "";
  if (provided !== secret) {
    res.status(401).json({ success: false, error: "unauthorized" });
    return;
  }

  const rows = getExportRows();
  let rank = 1;
  const ranked = rows.map((row, i) => {
    if (i > 0 && row.total < rows[i - 1]!.total) {
      rank = i + 1;
    }
    return { ...row, rank };
  });

  const lines = [
    "rank,nickname,telegram_id,telegram_username,telegram_first_name,telegram_last_name,total,daily_goal",
    ...ranked.map(
      (r) =>
        `${r.rank},${csvEscape(r.nickname)},${r.telegram_id},${csvEscape(r.telegram_username ?? "")},${csvEscape(r.telegram_first_name ?? "")},${csvEscape(r.telegram_last_name ?? "")},${r.total},${r.goal}`
    ),
  ];

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="salawat-export.csv"');
  res.send(lines.join("\n") + "\n");
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

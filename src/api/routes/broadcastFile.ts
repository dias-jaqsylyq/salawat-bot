import { basename } from "node:path";
import type { NextFunction, Request, Response } from "express";
import { InputFile, type Bot } from "grammy";
import multer from "multer";
import type { MyContext } from "../../context.js";
import type { User } from "../../types.js";
import { validOptionalCaption } from "../broadcastFormatting.js";
import {
  broadcastToAll,
  BroadcastInProgressError,
} from "../broadcastService.js";

export const MAX_PDF_BYTES = 20 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    const pdfName = file.originalname.toLowerCase().endsWith(".pdf");
    const pdfMime = file.mimetype === "application/pdf";
    callback(null, pdfName && pdfMime);
  },
}).single("file");

export function hasPdfSignature(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

export function adminPdfUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  upload(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ success: false, error: "file_too_large" });
      return;
    }
    if (err) {
      res.status(400).json({ success: false, error: "invalid_file" });
      return;
    }
    next();
  });
}

function safeFilename(original: string): string {
  const cleaned = basename(original).replace(/[^\w.\- ()]/g, "_");
  return cleaned || "document.pdf";
}

export function createPdfSender(
  bot: Bot<MyContext>,
  buffer: Buffer,
  filename: string,
  caption?: string
): (user: User) => Promise<void> {
  let telegramFileId: string | undefined;
  return async (user: User): Promise<void> => {
    const document = telegramFileId ?? new InputFile(buffer, filename);
    const sent = await bot.api.sendDocument(user.telegram_id, document, {
      caption,
    });
    telegramFileId ??= sent.document?.file_id;
  };
}

export function createBroadcastFileRoute(bot: Bot<MyContext>) {
  return async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    if (!file || !hasPdfSignature(file.buffer)) {
      res.status(400).json({ success: false, error: "invalid_pdf" });
      return;
    }
    if (!validOptionalCaption(req.body?.message)) {
      res.status(400).json({ success: false, error: "invalid_caption" });
      return;
    }

    const caption = req.body?.message?.trim() || undefined;
    const filename = safeFilename(file.originalname);

    try {
      const result = await broadcastToAll(
        createPdfSender(bot, file.buffer, filename, caption)
      );
      res.json({ success: true, ...result });
    } catch (err) {
      if (err instanceof BroadcastInProgressError) {
        res.status(409).json({ success: false, error: "broadcast_in_progress" });
        return;
      }
      throw err;
    }
  };
}

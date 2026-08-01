import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

/**
 * Telegram echoes back the secret token you configured in setWebhook via
 * this header on every request. Reject anything that doesn't match —
 * otherwise anyone who discovers the webhook URL could POST fake
 * updates (fake commands, fake callback_query approvals, etc).
 */
export function verifyTelegramSecret(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = req.header("X-Telegram-Bot-Api-Secret-Token");
  if (token !== env.WEBHOOK_SECRET) {
    res.sendStatus(401);
    return;
  }
  next();
}

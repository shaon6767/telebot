import "dotenv/config";
import express from "express";
import { webhookCallback } from "grammy";
import { bot } from "./bot/index.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { startExpiryCheckJob } from "./jobs/expiryCheck.job.js";
import { verifyTelegramSecret } from "./webhook/verifySecret.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post(
  "/telegram/webhook",
  verifyTelegramSecret,
  webhookCallback(bot, "express"),
);

async function main(): Promise<void> {
  await bot.api.setWebhook(`${env.WEBHOOK_URL}/telegram/webhook`, {
    secret_token: env.WEBHOOK_SECRET,
  });
  logger.info({ url: env.WEBHOOK_URL }, "Webhook registered");

  startExpiryCheckJob(bot);

  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Server started");
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});

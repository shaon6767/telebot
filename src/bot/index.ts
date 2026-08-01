import { conversations, createConversation } from "@grammyjs/conversations";
import { Bot, session } from "grammy";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { handleApprovalCallback } from "./commands/approvePayment.js";
import { myStatusCommand } from "./commands/myStatus.js";
import { setupGroupConversation } from "./commands/setupGroup.js";
import { startCommand } from "./commands/start.js";
import { submitPaymentCommand } from "./commands/submitPayment.js";
import { subscribeCommand } from "./commands/subscribe.js";
import { requireGroupAdmin } from "./middlewares/isGroupAdmin.js";
import type { MyContext, SessionData } from "./types.js";

export const bot = new Bot<MyContext>(env.BOT_TOKEN);

bot.use(session<SessionData, MyContext>({ initial: () => ({}) }));
bot.use(conversations<MyContext, MyContext>());
bot.use(
  createConversation<MyContext, MyContext>(
    setupGroupConversation,
    "setupGroup",
  ),
);

bot.command("start", startCommand);

bot.command("setupgroup", requireGroupAdmin, async (ctx) => {
  await ctx.conversation.enter("setupGroup");
});

bot.command("subscribe", subscribeCommand);
bot.command("paid", submitPaymentCommand);
bot.command("mystatus", myStatusCommand);

bot.callbackQuery(/^(approve|reject):\d+$/, handleApprovalCallback);

bot.catch((err) => {
  logger.error(
    { err: err.error, update: err.ctx?.update },
    "Unhandled bot error",
  );
});

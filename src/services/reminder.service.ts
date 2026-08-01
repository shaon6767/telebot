import type { Api } from "grammy";
import { withTelegramRetry } from "./telegramRetry.js";

export async function sendRenewalReminder(
  api: Api,
  telegramUserId: bigint,
  groupName: string,
  daysLeft: number,
): Promise<void> {
  await withTelegramRetry(
    () =>
      api.sendMessage(
        Number(telegramUserId),
        `⏰ Your subscription to "${groupName}" expires in ${daysLeft} day(s). Send /subscribe to renew before you lose access.`,
      ),
    "sendMessage:reminder",
  );
}

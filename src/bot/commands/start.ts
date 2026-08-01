import type { MyContext } from "../types.js";

export async function startCommand(ctx: MyContext): Promise<void> {
  await ctx.reply(
    "👋 Welcome!\n\n" +
      "If you're a group admin: run /setupgroup inside your group to start charging for access.\n" +
      "If you're joining a paid group: run /subscribe inside that group to see payment instructions.",
  );
}

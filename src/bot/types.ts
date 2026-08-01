import type { ConversationFlavor } from "@grammyjs/conversations";
import type { Context, SessionFlavor } from "grammy";

// No custom session data needed — conversations plugin manages its own
// state internally, this is just the empty shape session() requires.
export type SessionData = Record<string, never>;

export type MyContext = Context &
  SessionFlavor<SessionData> &
  ConversationFlavor<Context>;

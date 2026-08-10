import { Bot } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import { config } from "./config.js";
import type { MyContext } from "./context.js";
import { REGISTRATION_CONVERSATION, registration } from "./conversations/registration.js";
import { salawatCommand } from "./commands/salawat.js";
import { myProgressCommand } from "./commands/myprogress.js";
import { leaderboardCommand } from "./commands/leaderboard.js";
import { helpCommand } from "./commands/help.js";

export function createBot(): Bot<MyContext> {
  const bot = new Bot<MyContext>(config.botToken);

  bot.use(conversations());
  bot.use(createConversation(registration, REGISTRATION_CONVERSATION));

  bot.command("start", (ctx) => ctx.conversation.enter(REGISTRATION_CONVERSATION));
  bot.command("salawat", salawatCommand);
  bot.command("myprogress", myProgressCommand);
  bot.command("leaderboard", leaderboardCommand);
  bot.command("help", helpCommand);

  bot.catch((err) => {
    console.error(`Error while handling update ${err.ctx.update.update_id}:`, err.error);
  });

  return bot;
}

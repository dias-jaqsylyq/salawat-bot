import { Bot } from "grammy";
import { config } from "./config.js";
import type { MyContext } from "./context.js";
import { helpCommand } from "./commands/help.js";

export function createBot(): Bot<MyContext> {
  const bot = new Bot<MyContext>(config.botToken);

  bot.command("start", helpCommand);
  bot.command("help", helpCommand);

  bot.catch((err) => {
    console.error(`Error while handling update ${err.ctx.update.update_id}:`, err.error);
  });

  return bot;
}

/** Points the chat menu button (next to the message box) at the Mini App. */
export async function setupMenuButton(bot: Bot<MyContext>): Promise<void> {
  await bot.api.setChatMenuButton({
    menu_button: {
      type: "web_app",
      text: "Open App",
      web_app: { url: config.miniAppUrl },
    },
  });
}

import type { MyContext } from "../context.js";

const HELP_TEXT =
  "🌙 *Salawat Challenge Bot*\n\n" +
  "/start — register and set your monthly goal\n" +
  "/salawat <number> — log salawat, e.g. /salawat 100\n" +
  "/myprogress — your total, goal, % complete, days left\n" +
  "/leaderboard — see how everyone ranks\n" +
  "/help — show this message";

export async function helpCommand(ctx: MyContext) {
  await ctx.reply(HELP_TEXT, { parse_mode: "Markdown" });
}

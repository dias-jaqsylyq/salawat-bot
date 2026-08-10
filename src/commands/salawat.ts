import type { MyContext } from "../context.js";
import { addLog, getUserByTelegramId, getUserTotal } from "../db/repository.js";

export async function salawatCommand(ctx: MyContext) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = getUserByTelegramId(telegramId);
  if (!user) {
    await ctx.reply("You're not registered yet. Send /start to join the challenge first.");
    return;
  }

  const arg = ctx.match?.toString().trim();
  const count = Number(arg);
  if (!arg || !Number.isInteger(count) || count <= 0) {
    await ctx.reply("Usage: /salawat <number>, e.g. /salawat 100");
    return;
  }

  addLog(user.id, count);
  const total = getUserTotal(user.id);

  await ctx.reply(
    `Logged *${count}* salawat. Your total so far: *${total}* / ${user.goal}.`,
    { parse_mode: "Markdown" }
  );
}

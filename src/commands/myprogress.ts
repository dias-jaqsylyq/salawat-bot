import type { MyContext } from "../context.js";
import { getUserByTelegramId, getUserTotal } from "../db/repository.js";
import { getDaysLeft, getPercentComplete, hasChallengeEnded } from "../utils/challenge.js";

export async function myProgressCommand(ctx: MyContext) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = getUserByTelegramId(telegramId);
  if (!user) {
    await ctx.reply("You're not registered yet. Send /start to join the challenge first.");
    return;
  }

  const total = getUserTotal(user.id);
  const percent = getPercentComplete(total, user.goal);
  const daysLeft = getDaysLeft();
  const daysLeftLine = hasChallengeEnded()
    ? "The challenge has ended."
    : daysLeft === 0
      ? "Today is the last day!"
      : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left.`;

  await ctx.reply(
    `📊 *${user.nickname}*'s progress\n` +
      `Total: *${total}* / ${user.goal} (${percent}%)\n` +
      daysLeftLine,
    { parse_mode: "Markdown" }
  );
}

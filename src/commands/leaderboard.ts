import type { MyContext } from "../context.js";
import { getLeaderboard } from "../db/repository.js";

const MEDALS = ["🥇", "🥈", "🥉"];

export async function leaderboardCommand(ctx: MyContext) {
  const rows = getLeaderboard();

  if (rows.length === 0) {
    await ctx.reply("No one's registered yet. Be the first with /start!");
    return;
  }

  const lines = rows.map((row, i) => {
    const rank = MEDALS[i] ?? `${i + 1}.`;
    return `${rank} ${row.nickname} — ${row.total}`;
  });

  await ctx.reply(`🏆 *Leaderboard*\n\n${lines.join("\n")}`, { parse_mode: "Markdown" });
}

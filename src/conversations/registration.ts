import type { Context } from "grammy";
import type { MyConversation } from "../context.js";
import { createUser, getUserByTelegramId } from "../db/repository.js";

export const REGISTRATION_CONVERSATION = "registration";

async function askNickname(conversation: MyConversation, ctx: Context): Promise<string> {
  while (true) {
    await ctx.reply("What nickname should we use for you?");
    const reply = await conversation.waitFor("message:text");
    const nickname = reply.message.text.trim();
    if (nickname.length > 0 && nickname.length <= 50) {
      return nickname;
    }
    await ctx.reply("Please send a nickname between 1 and 50 characters.");
  }
}

async function askGoal(conversation: MyConversation, ctx: Context): Promise<number> {
  while (true) {
    await ctx.reply("What's your salawat goal for this month? (send a whole number, e.g. 3000)");
    const reply = await conversation.waitFor("message:text");
    const goal = Number(reply.message.text.trim());
    if (Number.isInteger(goal) && goal > 0) {
      return goal;
    }
    await ctx.reply("Please send a positive whole number, e.g. 3000.");
  }
}

export async function registration(conversation: MyConversation, ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const existing = await conversation.external(() => getUserByTelegramId(telegramId));
  if (existing) {
    await ctx.reply(
      `You're already registered as *${existing.nickname}* with a goal of *${existing.goal}*.\nUse /myprogress to check how you're doing.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  await ctx.reply("Assalamu alaikum! Welcome to the Salawat Challenge. 🌙");
  const nickname = await askNickname(conversation, ctx);
  const goal = await askGoal(conversation, ctx);

  await conversation.external(() => createUser(telegramId, nickname, goal));

  await ctx.reply(
    `You're in, *${nickname}*! Goal: *${goal}* salawat this month.\n` +
      `I'll remind you daily. Log your salawat anytime with /salawat <number>.`,
    { parse_mode: "Markdown" }
  );
}

import cron from "node-cron";
import { InlineKeyboard, type Bot } from "grammy";
import { config } from "../config.js";
import { getAllUsers } from "../db/repository.js";
import { hasChallengeEnded } from "../utils/challenge.js";
import type { MyContext } from "../context.js";

const REMINDER_TEXT = "🌙 Don't forget today's salawat! Tap below to log it.";
const REMINDER_KEYBOARD = new InlineKeyboard().url("Log Salawat", config.miniAppDeepLink);

async function sendDailyReminders(bot: Bot<MyContext>) {
  if (hasChallengeEnded()) return;

  const users = getAllUsers();
  for (const user of users) {
    try {
      await bot.api.sendMessage(user.telegram_id, REMINDER_TEXT, {
        reply_markup: REMINDER_KEYBOARD,
      });
    } catch (err) {
      console.error(`Failed to send reminder to user ${user.telegram_id} (${user.nickname}):`, err);
    }
  }
}

export function startReminderScheduler(bot: Bot<MyContext>) {
  const { hour, minute } = config.reminderTime;
  const cronExpression = `${minute} ${hour} * * *`;

  cron.schedule(cronExpression, () => void sendDailyReminders(bot), {
    timezone: config.timezone,
  });

  console.log(
    `Daily reminder scheduled for ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} (${config.timezone})`
  );
}

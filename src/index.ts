import "./db/client.js";
import { createBot } from "./bot.js";
import { startReminderScheduler } from "./scheduler/reminder.js";

const bot = createBot();

startReminderScheduler(bot);

bot.start({
  onStart: (botInfo) => {
    console.log(`Salawat Challenge bot started as @${botInfo.username}`);
  },
});

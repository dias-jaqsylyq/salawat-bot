import "./db/client.js";
import { config } from "./config.js";
import { createBot, setupMenuButton } from "./bot.js";
import { startReminderScheduler } from "./scheduler/reminder.js";
import { createApiServer } from "./api/server.js";

const bot = createBot();

startReminderScheduler(bot);
await setupMenuButton(bot);

createApiServer().listen(config.port, () => {
  console.log(`API server listening on port ${config.port}`);
});

bot.start({
  onStart: (botInfo) => {
    console.log(`Salawat Challenge bot started as @${botInfo.username}`);
  },
});

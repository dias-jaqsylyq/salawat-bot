import type { MyContext } from "../context.js";

const MENU_BUTTON_TEXT =
  "🌙 *Salawat Challenge*\n\n" +
  "All registration, logging, and progress tracking now happens in the app.\n\n" +
  "Tap the menu button (☰ next to the message box) to open it.";

export async function helpCommand(ctx: MyContext) {
  await ctx.reply(MENU_BUTTON_TEXT, { parse_mode: "Markdown" });
}

import type { Context } from "grammy";
import type { Conversation, ConversationFlavor } from "@grammyjs/conversations";

export type MyContext = ConversationFlavor<Context>;
export type MyConversation = Conversation<MyContext, Context>;

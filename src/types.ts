export interface User {
  id: number;
  telegram_id: number;
  nickname: string;
  goal: number;
  created_at: string;
}

export interface LogEntry {
  id: number;
  user_id: number;
  count: number;
  logged_at: string;
}

export interface LeaderboardRow {
  nickname: string;
  total: number;
}

export interface DateParts {
  year: number;
  month: number;
  day: number;
}

/** Conversation-scoped session data used by @grammyjs/conversations. */
export interface SessionData {}

export interface User {
  id: number;
  telegram_id: number;
  nickname: string;
  goal: number;
  /** SQLite 0/1; default 1 (reminders on). */
  reminder_enabled: number;
  /** HH:mm override in challenge TIMEZONE, or null to use global REMINDER_TIME. */
  reminder_time: string | null;
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
  telegram_id: number;
}

export interface ExportRow {
  nickname: string;
  telegram_id: number;
  goal: number;
  total: number;
}

export interface DateParts {
  year: number;
  month: number;
  day: number;
}

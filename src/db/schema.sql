CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  goal INTEGER NOT NULL,
  reminder_enabled INTEGER NOT NULL DEFAULT 1,
  reminder_time TEXT,
  fasting_reminder_enabled INTEGER NOT NULL DEFAULT 0,
  fasting_reminder_time TEXT NOT NULL DEFAULT '20:00',
  telegram_username TEXT,
  telegram_first_name TEXT,
  telegram_last_name TEXT,
  real_name TEXT,
  retained_jamaat_total INTEGER NOT NULL DEFAULT 0,
  progress_started_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  count INTEGER NOT NULL,
  logged_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);

/** Per-day goal met/missed overrides (makeup) — does not change logged salawat. */
CREATE TABLE IF NOT EXISTS day_goal_overrides (
  user_id INTEGER NOT NULL REFERENCES users(id),
  day TEXT NOT NULL,
  met INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, day)
);

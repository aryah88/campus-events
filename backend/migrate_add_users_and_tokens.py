# migrate_add_users_and_tokens.py
import sqlite3

DB = "events.db"

schema = """
-- users table: role = "student" or "admin"
CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  name TEXT,
  password_hash TEXT,
  role TEXT,
  created_at TEXT
);

-- tokens table: maps token -> user
CREATE TABLE IF NOT EXISTS auth_tokens (
  token TEXT PRIMARY KEY,
  user_id INTEGER,
  created_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
"""

conn = sqlite3.connect(DB)
cur = conn.cursor()
cur.executescript(schema)
conn.commit()
conn.close()
print("✅ users + auth_tokens tables ensured")

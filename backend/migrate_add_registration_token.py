# run once to add column (if not exists)
import sqlite3
conn = sqlite3.connect("events.db")
cur = conn.cursor()
# Add column if doesn't exist (SQLite silent if exists will error — we guard)
cols = [r[1] for r in cur.execute("PRAGMA table_info(registration)").fetchall()]
if "token" not in cols:
    cur.execute("ALTER TABLE registration ADD COLUMN token TEXT")
    print("Added token column to registration")
else:
    print("token column already present")
conn.commit()
conn.close()

# check_db.py
import sqlite3, os

print("cwd:", os.getcwd())
print("events.db exists:", os.path.exists("events.db"))

conn = sqlite3.connect("events.db")
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
print("Tables:", cur.fetchall())
cur.execute("SELECT student_id, name FROM student LIMIT 5;")
print("Sample students:", cur.fetchall())
conn.close()

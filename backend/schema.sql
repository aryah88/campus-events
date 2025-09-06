-- backend/schema.sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS college (
  college_id TEXT PRIMARY KEY,
  name TEXT
);

CREATE TABLE IF NOT EXISTS student (
  student_id TEXT PRIMARY KEY,
  name TEXT,
  roll_no TEXT,
  college_id TEXT,
  FOREIGN KEY (college_id) REFERENCES college(college_id)
);

CREATE TABLE IF NOT EXISTS event (
  event_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT,
  description TEXT,
  starts_at TEXT,
  capacity INTEGER,
  college_id TEXT,
  cancelled_flag INTEGER DEFAULT 0,
  features TEXT, -- comma-separated tags / "features"
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS registration (
  reg_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT,
  student_id TEXT,
  registered_at TEXT,
  token TEXT UNIQUE,
  status TEXT DEFAULT 'registered',
  FOREIGN KEY (event_id) REFERENCES event(event_id),
  FOREIGN KEY (student_id) REFERENCES student(student_id)
);

CREATE TABLE IF NOT EXISTS attendance (
  att_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT,
  student_id TEXT,
  attended_at TEXT,
  present INTEGER DEFAULT 1,
  FOREIGN KEY (event_id) REFERENCES event(event_id),
  FOREIGN KEY (student_id) REFERENCES student(student_id)
);

CREATE TABLE IF NOT EXISTS feedback (
  fb_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT,
  student_id TEXT,
  rating INTEGER,
  comment TEXT,
  submitted_at TEXT,
  FOREIGN KEY (event_id) REFERENCES event(event_id),
  FOREIGN KEY (student_id) REFERENCES student(student_id)
);

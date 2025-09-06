import sqlite3

def run_script(db_name, schema_file):
    with open(schema_file, "r", encoding="utf-8") as f:
        schema = f.read()

    conn = sqlite3.connect(db_name)
    cur = conn.cursor()
    cur.executescript(schema)
    conn.commit()
    conn.close()
    print(f"✅ Database {db_name} initialized from {schema_file}")

if __name__ == "__main__":
    run_script("events.db", "schema.sql")

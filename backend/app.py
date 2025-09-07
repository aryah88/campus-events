# backend/app.py
import os
import sqlite3
import secrets
import datetime
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

# JWT imports (use verify_jwt_in_request wrapped in helper for compatibility)
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
    verify_jwt_in_request,
)

# ---------------- config ----------------
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret-key")
DB_NAME = os.environ.get("DB_NAME", "events.db")
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")

# Allow common dev origins: Vite and Expo (exp://)
CORS(app, supports_credentials=True, resources={r"/*": {"origins": [FRONTEND_ORIGIN, "http://localhost:5173", "exp://*"]}})

# JWT config
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = datetime.timedelta(hours=8)
jwt = JWTManager(app)

# ---------------- small helpers ----------------
def now_iso():
    return datetime.datetime.utcnow().isoformat()

def get_jwt_identity_optional():
    """
    Try to verify a JWT in the request. If a valid JWT is present,
    return the identity dict. If no JWT or invalid, return None.
    """
    try:
        verify_jwt_in_request()
        return get_jwt_identity()
    except Exception:
        return None

def get_conn():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def query(sql, params=()):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(sql, params)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def execute(sql, params=()):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(sql, params)
    conn.commit()
    conn.close()

# ---------------- startup migrations (safe) ----------------
def ensure_column_exists(table, column_def, col_name):
    """Ensure the column exists in table; if not, ALTER TABLE add it."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(%s)" % table)
    cols = [r["name"] for r in cur.fetchall()]
    if col_name not in cols:
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {column_def}")
        conn.commit()
    conn.close()

def ensure_indexes():
    conn = get_conn()
    cur = conn.cursor()
    # unique index on attendance (event_id, student_id) to allow upsert
    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_att_event_student ON attendance(event_id, student_id);")
    conn.commit()
    conn.close()

def ensure_schema():
    # ensure features column on event exists (non-destructive)
    try:
        ensure_column_exists("event", "features TEXT", "features")
    except Exception:
        pass
    # ensure unique index for attendance upserts
    try:
        ensure_indexes()
    except Exception:
        pass

# run migrations
ensure_schema()
# dev-only: add to backend/app.py (restart Flask after adding)
@app.route("/debug/reset_password", methods=["POST"])
def debug_reset_password():
    data = request.json or {}
    email = (data.get("email") or "").strip().lower()
    newpw = data.get("new_password") or ""
    if not email or not newpw:
        return jsonify({"error":"email & new_password required"}), 400
    pw_hash = generate_password_hash(newpw)
    execute("UPDATE users SET password_hash = ? WHERE lower(email) = lower(?)", (pw_hash, email))
    return jsonify({"message":"password updated for " + email})

# ---------------- auth helpers ----------------
def get_user_by_email(email):
    rows = query("SELECT * FROM users WHERE lower(email) = lower(?)", (email.lower(),))
    return rows[0] if rows else None

def require_session(roles=None):
    """
    Accept either a valid JWT or an active session cookie.
    Returns:
      - user dict when authenticated
      - (response,status) tuple when unauthenticated/forbidden
      - None for OPTIONS preflight
    """
    if request.method == "OPTIONS":
        return None

    # 1) Try JWT first (optional)
    identity = get_jwt_identity_optional()
    if identity:
        # identity expected to contain {"id":..., "email":..., "role":...}
        u = query("SELECT user_id, email, name, role FROM users WHERE user_id = ?", (identity.get("id"),))
        if u:
            user = u[0]
            if roles and user.get("role") not in roles:
                return (jsonify({"error":"forbidden"}), 403)
            return user
        # if identity provided but no matching user, treat as unauthenticated
        return (jsonify({"error":"unauthenticated"}), 401)

    # 2) Fallback to session cookie (existing behavior)
    u_id = session.get("user_id")
    if not u_id:
        return (jsonify({"error":"unauthenticated"}), 401)
    u = query("SELECT user_id, email, name, role FROM users WHERE user_id = ?", (u_id,))
    if not u:
        session.clear()
        return (jsonify({"error":"unauthenticated"}), 401)
    user = u[0]
    if roles and user.get("role") not in roles:
        return (jsonify({"error":"forbidden"}), 403)
    return user

# ---------------- auth endpoints ----------------
@app.route("/auth/signup", methods=["POST"])
def signup():
    data = request.json or {}
    email = (data.get("email") or "").strip().lower()
    name = data.get("name") or ""
    password = data.get("password") or ""
    role = data.get("role") or "student"
    if not email or not password:
        return jsonify({"error":"email & password required"}), 400
    if get_user_by_email(email):
        return jsonify({"error":"email already registered"}), 409
    pw_hash = generate_password_hash(password)
    execute("INSERT INTO users (email,name,password_hash,role,created_at) VALUES (?,?,?,?,?)",
            (email, name, pw_hash, role, now_iso()))
    u = get_user_by_email(email)
    session.clear()
    session["user_id"] = u["user_id"]
    session["role"] = u["role"]
    session["email"] = u["email"]
    # Create JWT for mobile clients as well
    identity = {"id": u["user_id"], "email": u["email"], "role": u["role"]}
    token = create_access_token(identity=identity)
    return jsonify({"message":"user created","role":u["role"], "email":u["email"], "token": token})

@app.route("/auth/login", methods=["POST"])
def login():
    # debug-friendly login handler — safe for local dev only
    data = request.json or {}
    # read raw incoming for debug
    raw_email = data.get("email")
    raw_password = data.get("password")
    # normalize as your app expects
    email = (raw_email or "").strip().lower()
    password = raw_password or ""

    app.logger.debug(f"[DEBUG LOGIN] incoming raw_email={repr(raw_email)} raw_password_len={len(raw_password or '')}")
    app.logger.debug(f"[DEBUG LOGIN] normalized email={email!r} password_len={len(password)}")

    # lookup
    u = get_user_by_email(email)
    if not u:
        app.logger.debug(f"[DEBUG LOGIN] user NOT FOUND for email={email!r}")
        # reply consistent with previous behavior
        return jsonify({"error":"invalid credentials"}), 401

    # debug info about stored row
    stored_hash = u.get("password_hash") or ""
    app.logger.debug(f"[DEBUG LOGIN] found user_id={u.get('user_id')} email={u.get('email')} role={u.get('role')} pw_hash_len={len(stored_hash)}")

    # check password (wrap in try to catch any hash-format issues)
    try:
        ok = check_password_hash(stored_hash, password)
    except Exception as e:
        app.logger.exception("[DEBUG LOGIN] check_password_hash raised exception")
        return jsonify({"error":"internal error"}), 500

    if not ok:
        app.logger.debug(f"[DEBUG LOGIN] password mismatch for user_id={u.get('user_id')}")
        return jsonify({"error":"invalid credentials"}), 401

    # success: create session + token and return
    session.clear()
    session["user_id"] = u["user_id"]
    session["role"] = u["role"]
    session["email"] = u["email"]
    identity = {"id": u["user_id"], "email": u["email"], "role": u["role"]}
    token = create_access_token(identity=identity)
    app.logger.debug(f"[DEBUG LOGIN] success for user_id={u.get('user_id')}")
    return jsonify({"message":"ok","role":u["role"],"email":u["email"], "token": token})


@app.route("/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message":"logged out"})

@app.route("/auth/whoami", methods=["GET"])
def whoami():
    # First try JWT identity (works for mobile when sending Authorization header)
    identity = get_jwt_identity_optional()
    if identity:
        return jsonify({
            "authenticated": True,
            "role": identity.get("role"),
            "email": identity.get("email"),
            "name": identity.get("name") if identity.get("name") else None
        })

    # Fallback to session cookie (existing behavior)
    u_id = session.get("user_id")
    if not u_id:
        return jsonify({"authenticated": False}), 200
    u = query("SELECT user_id, email, name, role FROM users WHERE user_id = ?", (u_id,))
    if not u:
        session.clear()
        return jsonify({"authenticated": False}), 200
    u = u[0]
    return jsonify({"authenticated": True, "role": u["role"], "email": u["email"], "name": u.get("name")})

# ---------------- events APIs ----------------
@app.route("/events", methods=["GET", "POST", "OPTIONS"])
def events_collection():
    if request.method == "OPTIONS":
        return "", 200
    if request.method == "POST":
        u = require_session(roles=["admin"])
        if isinstance(u, tuple): return u
        data = request.json or {}
        title = (data.get("title") or "").strip()
        etype = (data.get("type") or "").strip()
        starts_at = data.get("starts_at")
        description = data.get("description") or ""
        capacity = data.get("capacity")
        college_id = data.get("college_id") or "c1"
        cancelled_flag = 1 if data.get("cancelled_flag") else 0
        features = data.get("features") or ""
        if not title or not etype or not starts_at:
            return jsonify({"error":"title, type and starts_at required"}), 400
        event_id = data.get("event_id") or f"ev{secrets.token_hex(4)}"
        try:
            execute(
                "INSERT INTO event (event_id,title,type,description,starts_at,capacity,college_id,cancelled_flag,features,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                (event_id, title, etype, description, starts_at, capacity, college_id, cancelled_flag, features, now_iso())
            )
            return jsonify({"message":"event created","event_id":event_id}), 201
        except sqlite3.IntegrityError:
            return jsonify({"error":"event id exists"}), 409

    # GET /events
    college_id = request.args.get("college_id")
    stype = request.args.get("type")
    search = request.args.get("search")
    feature = request.args.get("feature")
    params = []
    where = []
    if college_id:
        where.append("e.college_id = ?"); params.append(college_id)
    if stype:
        where.append("e.type = ?"); params.append(stype)
    if search:
        where.append("e.title LIKE ?"); params.append(f"%{search}%")
    base = """
      SELECT e.event_id, e.title, e.type, e.description, e.starts_at, e.capacity, e.college_id, e.cancelled_flag, e.features,
             COUNT(r.reg_id) as registered_count
      FROM event e
      LEFT JOIN registration r ON e.event_id = r.event_id AND r.status='registered'
    """
    if where:
        base += " WHERE " + " AND ".join(where)
    base += " GROUP BY e.event_id ORDER BY e.starts_at ASC"
    rows = query(base, tuple(params))
    if feature:
        feature_low = feature.lower()
        rows = [r for r in rows if r.get("features") and feature_low in r["features"].lower().split(",")]
    return jsonify(rows)

@app.route("/events/<event_id>", methods=["GET", "PUT", "DELETE", "OPTIONS"])
def event_item(event_id):
    if request.method == "OPTIONS":
        return "", 200
    if request.method == "GET":
        rows = query("SELECT * FROM event WHERE event_id = ?", (event_id,))
        if not rows: return jsonify({"error":"not found"}), 404
        return jsonify(rows[0])
    if request.method == "PUT":
        u = require_session(roles=["admin"])
        if isinstance(u, tuple): return u
        data = request.json or {}
        updates = []
        params = []
        for col in ("title","type","description","starts_at","capacity","college_id","cancelled_flag","features"):
            if col in data:
                updates.append(f"{col} = ?")
                params.append(data[col])
        if not updates:
            return jsonify({"error":"nothing to update"}), 400
        params.append(event_id)
        sql = "UPDATE event SET " + ", ".join(updates) + " WHERE event_id = ?"
        execute(sql, tuple(params))
        return jsonify({"message":"updated"})
    if request.method == "DELETE":
        u = require_session(roles=["admin"])
        if isinstance(u, tuple): return u
        execute("DELETE FROM event WHERE event_id = ?", (event_id,))
        return jsonify({"message":"deleted"})

# ---------------- registration / feedback / attendance ----------------
@app.route("/events/<event_id>/register", methods=["POST"])
def register_student(event_id):
    data = request.json or {}
    student_id = (data.get("student_id") or "").strip()
    if not student_id:
        return jsonify({"error":"student_id required"}), 400
    # normalize student id to lowercase for storage
    student_id = student_id.lower()
    ev = query("SELECT * FROM event WHERE event_id = ?", (event_id,))
    if not ev: return jsonify({"error":"event not found"}), 404
    ev = ev[0]
    if ev.get("cancelled_flag"):
        return jsonify({"error":"event cancelled"}), 400
    if ev["capacity"] is not None:
        reg_count = query('SELECT COUNT(*) as cnt FROM registration WHERE event_id = ? AND status="registered"', (event_id,))[0]['cnt']
        if reg_count >= ev["capacity"]:
            return jsonify({"error":"capacity full"}), 400
    token = secrets.token_urlsafe(12)
    try:
        execute("INSERT INTO registration (event_id,student_id,registered_at,token,status) VALUES (?,?,?,?,?)",
                (event_id, student_id, now_iso(), token, "registered"))
        return jsonify({"message":"registered","token":token}), 201
    except sqlite3.IntegrityError:
        existing = query("SELECT token FROM registration WHERE event_id=? AND student_id=?", (event_id, student_id))
        tok = existing[0].get("token") if existing else None
        return jsonify({"error":"already registered","token":tok}), 409

@app.route("/feedback/<event_id>", methods=["POST"])
def feedback(event_id):
    data = request.json or {}
    student_id = (data.get("student_id") or "").strip().lower()
    rating = data.get("rating")
    comment = data.get("comment")
    execute("INSERT INTO feedback (event_id,student_id,rating,comment,submitted_at) VALUES (?,?,?,?,?)",
            (event_id, student_id, rating, comment, now_iso()))
    return jsonify({"message":"feedback submitted"})

@app.route("/events/<event_id>/attendance", methods=["POST", "OPTIONS"])
def attendance_manual(event_id):
    if request.method == "OPTIONS":
        return "", 200
    data = request.json or {}
    student_id = (data.get("student_id") or "").strip()
    if not student_id:
        return jsonify({"error":"student_id required"}), 400
    student_id = student_id.lower()
    try:
        # UPSERT using ON CONFLICT on (event_id, student_id)
        conn = sqlite3.connect(DB_NAME)
        cur = conn.cursor()
        now = now_iso()
        sql = """
            INSERT INTO attendance (event_id, student_id, attended_at, present)
            VALUES (?, ?, ?, 1)
            ON CONFLICT(event_id, student_id) DO UPDATE SET
                attended_at = excluded.attended_at,
                present = 1
        """
        cur.execute(sql, (event_id, student_id, now))
        conn.commit()
        conn.close()
        return jsonify({"message":"attendance marked","event_id":event_id,"student_id":student_id}), 201
    except Exception:
        # fallback to older behavior
        try:
            execute("INSERT INTO attendance (event_id, student_id, attended_at, present) VALUES (?,?,?,1)",
                    (event_id, student_id, now_iso()))
            return jsonify({"message":"attendance marked","event_id":event_id,"student_id":student_id}), 201
        except sqlite3.IntegrityError:
            execute("UPDATE attendance SET attended_at=?, present=1 WHERE event_id=? AND student_id=?",
                    (now_iso(), event_id, student_id))
            return jsonify({"message":"attendance updated","event_id":event_id,"student_id":student_id}), 200

@app.route("/attendance/token", methods=["POST"])
def attendance_by_token():
    u = require_session(roles=["admin"])
    if isinstance(u, tuple): return u
    data = request.json or {}
    token = data.get("token")
    if not token: return jsonify({"error":"token required"}), 400
    reg = query("SELECT event_id,student_id FROM registration WHERE token=? AND status='registered'", (token,))
    if not reg: return jsonify({"error":"invalid token"}), 404
    row = reg[0]
    # normalize student id
    student_id = (row["student_id"] or "").strip().lower()
    try:
        conn = sqlite3.connect(DB_NAME)
        cur = conn.cursor()
        now = now_iso()
        sql = """
            INSERT INTO attendance (event_id, student_id, attended_at, present)
            VALUES (?, ?, ?, 1)
            ON CONFLICT(event_id, student_id) DO UPDATE SET
                attended_at = excluded.attended_at,
                present = 1
        """
        cur.execute(sql, (row["event_id"], student_id, now))
        conn.commit()
        conn.close()
        return jsonify({"message":"attendance marked","event_id":row["event_id"],"student_id":student_id}), 201
    except Exception:
        try:
            execute("INSERT INTO attendance (event_id, student_id, attended_at, present) VALUES (?,?,?,1)",
                    (row["event_id"], student_id, now_iso()))
            return jsonify({"message":"attendance marked","event_id":row["event_id"],"student_id":student_id}), 201
        except sqlite3.IntegrityError:
            execute("UPDATE attendance SET attended_at=?, present=1 WHERE event_id=? AND student_id=?",
                    (now_iso(), row["event_id"], student_id))
            return jsonify({"message":"attendance updated","event_id":row["event_id"],"student_id":student_id}), 200

# ---------------- reports (admin) ----------------
@app.route("/reports/registrations", methods=["GET"])
def report_registrations():
    u = require_session(roles=["admin"])
    if isinstance(u, tuple): return u
    college_id = request.args.get("college_id")
    sql = """
      SELECT e.event_id,e.title,e.type,COUNT(r.reg_id) as registrations
      FROM event e
      LEFT JOIN registration r ON e.event_id=r.event_id AND r.status='registered'
      WHERE (? IS NULL OR e.college_id=?)
      GROUP BY e.event_id
      ORDER BY registrations DESC
    """
    return jsonify(query(sql, (college_id, college_id)))

@app.route("/reports/attendance_percentage", methods=["GET"])
def report_attendance_percentage():
    u = require_session(roles=["admin"])
    if isinstance(u, tuple): return u
    event_id = request.args.get("event_id")
    sql = """
      SELECT e.event_id,e.title,
             COUNT(DISTINCT r.reg_id) as registrations,
             COUNT(DISTINCT a.att_id) as presents,
             ROUND(100.0*COUNT(DISTINCT a.att_id)/NULLIF(COUNT(DISTINCT r.reg_id),0),1) as attendance_pct
      FROM event e
      LEFT JOIN registration r ON e.event_id = r.event_id
      LEFT JOIN attendance a ON e.event_id=a.event_id AND r.student_id = a.student_id AND a.present=1
      WHERE (? IS NULL OR e.event_id=?)
      GROUP BY e.event_id
      ORDER BY attendance_pct DESC
    """
    return jsonify(query(sql, (event_id, event_id)))

@app.route("/reports/top-active-students", methods=["GET"])
def report_top_students():
    u = require_session(roles=["admin"])
    if isinstance(u, tuple): return u
    college_id = request.args.get("college_id")
    try:
        limit = int(request.args.get("limit", 10))
    except:
        limit = 10
    sql = """
    SELECT s.student_id, s.name, s.roll_no,
           COALESCE(COUNT(a.att_id), 0) as attended_events
    FROM student s
    LEFT JOIN attendance a
      ON s.student_id = a.student_id COLLATE NOCASE
     AND a.present = 1
    WHERE (? IS NULL OR s.college_id = ?)
    GROUP BY s.student_id
    ORDER BY attended_events DESC
    LIMIT ?
    """
    rows = query(sql, (college_id, college_id, limit))
    return jsonify(rows)

@app.route("/reports/avg_feedback", methods=["GET"])
def report_avg_feedback():
    u = require_session(roles=["admin"])
    if isinstance(u, tuple): return u
    college_id = request.args.get("college_id")
    sql = """
      SELECT e.event_id,e.title,
             AVG(f.rating) as avg_rating,
             COUNT(f.fb_id) as feedback_count
      FROM event e
      LEFT JOIN feedback f ON e.event_id=f.event_id
      WHERE (? IS NULL OR e.college_id=?)
      GROUP BY e.event_id
      ORDER BY avg_rating DESC
    """
    rows = query(sql,(college_id,college_id))
    for r in rows:
        r["avg_rating"] = round(r["avg_rating"],2) if r.get("avg_rating") is not None else None
    return jsonify(rows)

# ---------------- misc ----------------
@app.route("/health")
def health():
    return {"status":"ok","db":DB_NAME}

# GET /registrations?student_id=<id>
@app.route("/registrations", methods=["GET"])
def get_registrations_for_student():
    student_id = request.args.get("student_id")
    if not student_id:
        return jsonify({"error": "student_id required"}), 400

    # case-insensitive match to handle r001 vs R001
    sql = """
      SELECT r.reg_id, r.event_id, r.token, r.status, r.registered_at,
             e.title AS event_title, e.starts_at AS event_starts_at, e.type AS event_type,
             e.description AS event_description, e.capacity AS event_capacity
      FROM registration r
      LEFT JOIN event e ON r.event_id = e.event_id
      WHERE lower(r.student_id) = lower(?)
      ORDER BY r.registered_at DESC
    """
    rows = query(sql, (student_id,))
    return jsonify(rows)

if __name__ == "__main__":
    # quick startup check
    print("Starting backend - DB:", DB_NAME, "Frontend origin:", FRONTEND_ORIGIN)
    app.run(host="0.0.0.0", port=5000, debug=True)

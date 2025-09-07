// frontend/src/services/api.js
const API = import.meta.env.VITE_API_BASE || "/api"; // use /api so Vite proxy works

async function safeJson(res) {
  try { return await res.json(); } catch { return {}; }
}

export function setToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}
export function getToken() {
  return localStorage.getItem("token");
}
function authHeaders() {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// ---------- AUTH ----------
export async function signup(email, name, password, role = "student") {
  const res = await fetch(`${API}/auth/signup`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, password, role }),
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j.error || "Signup failed");
  if (j.token) setToken(j.token);
  return j;
}

export async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j.error || "Login failed");
  if (j.token) setToken(j.token);
  return j;
}

export async function logout() {
  setToken(null);
  await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" }).catch(()=>{});
}

export async function whoami() {
  const token = getToken();
  const res = token
    ? await fetch(`${API}/auth/whoami`, { headers: { Authorization: `Bearer ${token}` } })
    : await fetch(`${API}/auth/whoami`, { credentials: "include" });
  if (!res.ok) return { authenticated: false };
  return res.json();
}

// ---------- EVENTS ----------
export async function getEvents({ collegeId = "c1", type = "", search = "", feature = "" } = {}) {
  const params = new URLSearchParams();
  if (collegeId) params.set("college_id", collegeId);
  if (type) params.set("type", type);
  if (search) params.set("search", search);
  if (feature) params.set("feature", feature);
  const res = await fetch(`${API}/events?${params.toString()}`, { credentials: "include", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

export async function createEvent(payload) {
  const res = await fetch(`${API}/events`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j.error || "Create event failed");
  return j;
}

export async function updateEvent(eventId, payload) {
  const res = await fetch(`${API}/events/${encodeURIComponent(eventId)}`, {
    method: "PUT",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j.error || "Update failed");
  return j;
}

export async function deleteEvent(eventId) {
  const res = await fetch(`${API}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    credentials: "include",
    headers: authHeaders(),
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j.error || "Delete failed");
  return j;
}

// ---------- REGISTRATION / ATTENDANCE / FEEDBACK ----------
export async function registerForEvent(eventId, studentId) {
  const res = await fetch(`${API}/events/${encodeURIComponent(eventId)}/register`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify({ student_id: studentId }),
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j.error || "Registration failed");
  return j;
}

export async function getRegistrationsForStudent(studentId) {
  if (!studentId) throw new Error("studentId required");
  const res = await fetch(`${API}/registrations?student_id=${encodeURIComponent(studentId)}`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(),
  });
  if (!res.ok) {
    let text = await res.text();
    throw new Error(text || "Failed to fetch registrations");
  }
  return res.json();
}

export async function submitFeedback(eventId, studentId, rating, comment) {
  if (!studentId) throw new Error("studentId required");
  const res = await fetch(`${API}/feedback/${encodeURIComponent(eventId)}`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify({ student_id: studentId, rating, comment }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=>res.statusText);
    throw new Error(txt || `Failed (${res.status})`);
  }
  return res.json();
}

export async function markAttendance(eventId, studentId) {
  const res = await fetch(`${API}/events/${encodeURIComponent(eventId)}/attendance`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify({ student_id: studentId }),
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j.error || "Mark attendance failed");
  return j;
}

export async function markAttendanceByToken(token) {
  const res = await fetch(`${API}/attendance/token`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify({ token }),
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j.error || "Attendance by token failed");
  return j;
}

// ---------- REPORTS (ADMIN) ----------
// exported names that your pages expect:
export async function getRegistrations(collegeId = "c1") {
  const res = await fetch(`${API}/reports/registrations?college_id=${encodeURIComponent(collegeId)}`, {
    credentials: "include",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch registrations report");
  return res.json();
}

export async function getAttendancePercentage(eventId = "") {
  const q = eventId ? `?event_id=${encodeURIComponent(eventId)}` : "";
  const res = await fetch(`${API}/reports/attendance_percentage${q}`, { credentials: "include", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch attendance");
  return res.json();
}

export async function getTopActiveStudents(collegeId = "c1", limit = 5) {
  const res = await fetch(`${API}/reports/top-active-students?college_id=${encodeURIComponent(collegeId)}&limit=${encodeURIComponent(limit)}`, { credentials: "include", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
}

export async function getAvgFeedback(collegeId = "c1") {
  const res = await fetch(`${API}/reports/avg_feedback?college_id=${encodeURIComponent(collegeId)}`, { credentials: "include", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch feedback");
  return res.json();
}

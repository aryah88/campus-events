// frontend/src/services/api.js
const API = import.meta.env.VITE_API_BASE || "/api"; // use /api so Vite proxy works

async function safeJson(res) {
  try { return await res.json(); } catch { return {}; }
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
  return j;
}

export async function logout() {
  await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
}

export async function whoami() {
  const res = await fetch(`${API}/auth/whoami`, { credentials: "include" });
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
  const res = await fetch(`${API}/events?${params.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

export async function createEvent(payload) {
  const res = await fetch(`${API}/events`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
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
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j.error || "Delete failed");
  return j;
}

// ---------- registration / attendance / reports (kept from before) ----------
export async function registerForEvent(eventId, studentId) {
  const res = await fetch(`${API}/events/${eventId}/register`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId }),
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j.error || "Registration failed");
  return j;
}

export async function submitFeedback(eventId, studentId, rating, comment) {
  const res = await fetch(`${API}/feedback/${eventId}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId, rating, comment }),
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j.error || "Feedback failed");
  return j;
}

export async function markAttendance(eventId, studentId) {
  const res = await fetch(`${API}/events/${eventId}/attendance`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j.error || "Attendance by token failed");
  return j;
}

// reports
export async function getRegistrations(collegeId = "c1") {
  const res = await fetch(`${API}/reports/registrations?college_id=${collegeId}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch registrations");
  return res.json();
}
export async function getAttendancePercentage(eventId = "") {
  const q = eventId ? `?event_id=${eventId}` : "";
  const res = await fetch(`${API}/reports/attendance_percentage${q}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch attendance");
  return res.json();
}
export async function getTopActiveStudents(collegeId = "c1", limit = 5) {
  const res = await fetch(`${API}/reports/top-active-students?college_id=${collegeId}&limit=${limit}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
}
export async function getAvgFeedback(collegeId = "c1") {
  const res = await fetch(`${API}/reports/avg_feedback?college_id=${collegeId}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch feedback");
  return res.json();
}
// frontend/src/services/api.js
export async function getRegistrationsForStudent(studentId) {
  if (!studentId) throw new Error("studentId required");
  const res = await fetch(`${API}/registrations?student_id=${encodeURIComponent(studentId)}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    let text = await res.text();
    throw new Error(text || "Failed to fetch registrations");
  }
  return res.json();
}

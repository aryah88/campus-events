// src/services/api.rn.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import axios from "axios";

/**
 * Robust mobile API client for Expo / React Native
 *
 * Behavior:
 *  - Default: iOS simulator -> http://127.0.0.1:5000
 *  - Android AVD     -> http://10.0.2.2:5000
 *  - If global.DEV_API_URL is set -> use that exact value (convenient override)
 *  - If global.USE_LAN_API is true -> use LAN_IP (raw IP) + PORT
 *  - If global.NGROK_URL is set -> use that (useful when LAN/firewall blocks)
 *
 * Notes:
 *  - LAN_IP should be raw IP (e.g. "192.168.202.180") — but this file tolerates "http://..." if you accidentally included it.
 *  - To force LAN while developing on a phone, set global.USE_LAN_API = true at top of App.js:
 *       if (__DEV__) global.USE_LAN_API = true;
 *  - To use ngrok: run `ngrok http 5000` and set global.NGROK_URL to the https URL returned by ngrok.
 */

const DEFAULT_PORT = 5000;

// Put your preferred LAN IP here (raw IP is preferred). If you accidentally put "http://..." this file will normalize it.
const LAN_IP = "192.168.202.180";

// Helper: normalize potential user-provided host strings into a valid base URL
function normalizeToBaseUrl(raw, defaultPort = DEFAULT_PORT) {
  if (!raw) return null;
  let s = String(raw).trim();

  // If already looks like https?://... return as-is (but remove trailing slash)
  if (/^https?:\/\//i.test(s)) {
    return s.replace(/\/+$/, "");
  }

  // If user provided host:port, keep port; else add defaultPort
  // strip any leading protocol if present accidentally
  s = s.replace(/^https?:\/\//i, "");
  s = s.replace(/\/+$/, "");
  // if it contains colon and looks like port provided, use as given
  if (s.includes(":")) {
    return `http://${s}`;
  }
  return `http://${s}:${defaultPort}`;
}

// 1) Highest priority override: explicit dev URL (exact)
const DEV_API_URL_OVERRIDE = typeof global !== "undefined" ? global.DEV_API_URL : null;
// 2) ngrok override (https recommended)
const NGROK_URL = typeof global !== "undefined" ? global.NGROK_URL : null;
// 3) If USE_LAN_API is true, prefer LAN
const USE_LAN = typeof global !== "undefined" ? !!global.USE_LAN_API : false;
// 4) Get LAN IP from global or use default
const GLOBAL_LAN_IP = typeof global !== "undefined" ? global.LAN_IP : null;

let API_BASE = normalizeToBaseUrl("127.0.0.1", DEFAULT_PORT); // iOS simulator default

try {
  // Quick platform-specific defaults
  if (Platform.OS === "android") {
    // Android emulator (AVD)
    API_BASE = normalizeToBaseUrl("10.0.2.2", DEFAULT_PORT);
  }

  // If DEV_API_URL override is provided take it as-is (highest priority)
  if (DEV_API_URL_OVERRIDE) {
    API_BASE = String(DEV_API_URL_OVERRIDE).replace(/\/+$/, "");
  } else if (NGROK_URL) {
    // ngrok explicit override (use https://abcd.ngrok.io)
    API_BASE = String(NGROK_URL).replace(/\/+$/, "");
  } else if (USE_LAN) {
    // Allow LAN_IP to be accidentally set with http or port; normalize it
    const lanIp = GLOBAL_LAN_IP || LAN_IP;
    API_BASE = normalizeToBaseUrl(lanIp, DEFAULT_PORT);
  }
} catch (e) {
  // fallback to default already set above
  console.warn("[api.rn] error during API_BASE computation", e);
}

console.log(`[api.rn] chosen API_BASE = ${API_BASE}`);
console.log(`[api.rn] Platform.OS = ${Platform.OS}, USE_LAN = ${USE_LAN}, DEV_API_URL_OVERRIDE = ${!!DEV_API_URL_OVERRIDE}, NGROK = ${!!NGROK_URL}, LAN_IP = ${GLOBAL_LAN_IP || LAN_IP}`);

// axios client
const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Attach token if present and log requests
client.interceptors.request.use(
  async (cfg) => {
    try {
      const t = await AsyncStorage.getItem("token");
      if (t) cfg.headers["Authorization"] = `Bearer ${t}`;
    } catch (e) {
      // ignore token read errors
    }

    // Defensive: ensure baseURL is not malformed at call-time
    if (!cfg.baseURL || !/^https?:\/\//i.test(cfg.baseURL)) {
      console.warn("[api.rn] WARNING: axios baseURL looks suspicious:", cfg.baseURL);
    }

    console.log(
      `[api.rn] REQUEST: ${cfg.method?.toUpperCase()} ${cfg.baseURL || ""}${cfg.url} ${
        cfg.params ? JSON.stringify(cfg.params) : ""
      }`
    );
    return cfg;
  },
  (err) => Promise.reject(err)
);

// Response logging + helpful error normalization
client.interceptors.response.use(
  (res) => {
    console.log(`[api.rn] RESPONSE: ${res.status} ${res.config?.url || res.request?.responseURL || ""}`);
    return res;
  },
  (err) => {
    // Normalize network errors into a friendly console output
    try {
      if (err.response) {
        // Server responded with a status code outside 2xx
        console.warn(
          `[api.rn] RESPONSE ERROR: status=${err.response.status} url=${err.response.config?.url}`,
          err.response.data
        );
      } else if (err.request) {
        // No response received
        console.warn(
          `[api.rn] NETWORK/NO RESPONSE: message=${err.message} baseURL=${client.defaults.baseURL} requestExists=${!!err.request}`
        );
      } else {
        // Axios setup/config error
        console.warn(`[api.rn] REQUEST SETUP ERROR: ${err.message}`);
      }
    } catch (logError) {
      console.warn("[api.rn] error while logging axios error", logError);
    }
    return Promise.reject(err);
  }
);

// --- exported API functions (same surface as before) ---
export async function login(email, password) {
  const res = await client.post("/auth/login", { email, password });
  const data = res.data;
  if (data && data.token) {
    await AsyncStorage.setItem("token", data.token);
  }
  return data;
}

export async function whoami() {
  try {
    const res = await client.get("/auth/whoami");
    return res.data;
  } catch (err) {
    return { authenticated: false };
  }
}

export async function getEvents({ collegeId = "c1", type = "", search = "", feature = "" } = {}) {
  const params = {};
  if (collegeId) params.college_id = collegeId;
  if (type) params.type = type;
  if (search) params.search = search;
  if (feature) params.feature = feature;
  const res = await client.get("/events", { params });
  return res.data;
}

export async function registerForEvent(eventId, studentId) {
  const res = await client.post(`/events/${encodeURIComponent(eventId)}/register`, { student_id: studentId });
  return res.data;
}

export async function getRegistrationsForStudent(studentId) {
  const res = await client.get("/registrations", { params: { student_id: studentId } });
  return res.data;
}

export async function submitFeedback(eventId, studentId, rating = 5, comment = "") {
  const res = await client.post(`/feedback/${encodeURIComponent(eventId)}`, { student_id: studentId, rating, comment });
  return res.data;
}

export async function markAttendance(eventId, studentId) {
  const res = await client.post(`/events/${encodeURIComponent(eventId)}/attendance`, { student_id: studentId });
  return res.data;
}
export async function markAttendanceByToken(token) {
  const res = await client.post("/attendance/token", { token });
  return res.data;
}

// reports
export async function getRegistrations(collegeId = "c1") {
  const res = await client.get("/reports/registrations", { params: { college_id: collegeId } });
  return res.data;
}
export async function getAttendancePercentage(eventId = "") {
  const res = await client.get("/reports/attendance_percentage", { params: eventId ? { event_id: eventId } : {} });
  return res.data;
}
export async function getTopActiveStudents(collegeId = "c1", limit = 5) {
  const res = await client.get("/reports/top-active-students", { params: { college_id: collegeId, limit } });
  return res.data;
}
export async function getAvgFeedback(collegeId = "c1") {
  const res = await client.get("/reports/avg_feedback", { params: { college_id: collegeId } });
  return res.data;
}

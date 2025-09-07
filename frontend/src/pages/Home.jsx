// frontend/src/pages/Home.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  getEvents,
  registerForEvent,
  getRegistrationsForStudent,
  submitFeedback,
} from "../services/api";
import toast from "react-hot-toast";
import { QRCodeCanvas } from "qrcode.react";

function FeedbackModal({ open, event, studentId, onClose, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  useEffect(() => {
    if (open) {
      setRating(5);
      setComment("");
    }
  }, [open]);
  if (!open || !event) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded p-4 w-96 shadow-lg">
        <h3 className="font-semibold mb-2">Feedback — {event.title}</h3>

        <label className="text-xs">Rating</label>
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-full mb-2 border p-2 rounded"
        >
          {[5, 4, 3, 2, 1].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full border p-2 rounded h-24 mb-3"
          placeholder="Write your feedback..."
        />

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Cancel
          </button>
          <button
            onClick={async () => {
              if (!studentId) {
                toast.error("Enter your student id first");
                return;
              }
              try {
                await submitFeedback(event.event_id, studentId, rating, comment);
                toast.success("Feedback submitted");
                onSubmitted && onSubmitted();
                onClose();
              } catch (err) {
                console.error(err);
                toast.error(err?.message || "Submit failed");
              }
            }}
            className="bg-indigo-600 text-white px-3 py-1 rounded"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [featureFilter, setFeatureFilter] = useState("");
  const searchRef = useRef(null);

  const [studentId, setStudentId] = useState(localStorage.getItem("studentId") || "");
  const [editingStudentId, setEditingStudentId] = useState(!localStorage.getItem("studentId"));

  const [qrTokens, setQrTokens] = useState({});

  const [registrations, setRegistrations] = useState([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  // feedback modal
  const [fbOpen, setFbOpen] = useState(false);
  const [fbEvent, setFbEvent] = useState(null);

  async function loadEvents({ searchText = search, type = typeFilter, feature = featureFilter } = {}) {
    setLoading(true);
    try {
      const data = await getEvents({ collegeId: "c1", type, search: searchText, feature });
      setEvents(data || []);
    } catch (err) {
      console.error("getEvents error", err);
      toast.error("Could not load events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => loadEvents({ searchText: search }), 350);
    return () => clearTimeout(searchRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, featureFilter]);

  useEffect(() => {
    loadEvents();
    if (studentId) loadRegistrations(studentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRegistrations(id) {
    if (!id) return;
    setLoadingRegs(true);
    try {
      const rows = await getRegistrationsForStudent(id);
      setRegistrations(rows || []);
      const map = {};
      (rows || []).forEach((r) => {
        if (r.token) map[r.event_id] = r.token;
      });
      setQrTokens((prev) => ({ ...prev, ...map }));
    } catch (err) {
      console.error("loadRegistrations", err);
      toast.error("Could not load your registrations");
      setRegistrations([]);
    } finally {
      setLoadingRegs(false);
    }
  }

  function saveStudentId() {
    if (!studentId || !studentId.trim()) {
      toast.error("Enter a valid student id");
      return;
    }
    const id = studentId.trim();
    localStorage.setItem("studentId", id);
    setEditingStudentId(false);
    loadRegistrations(id);
    toast.success("Student id saved");
  }

  async function onRegister(eventId) {
    if (!studentId) {
      toast.error("Please enter your student id first");
      setEditingStudentId(true);
      return;
    }
    try {
      const res = await registerForEvent(eventId, studentId);
      if (res.token) setQrTokens((prev) => ({ ...prev, [eventId]: res.token }));
      toast.success("Registered successfully");
      loadRegistrations(studentId);
      loadEvents();
    } catch (err) {
      console.error("registerForEvent err", err);
      toast.error(err?.message || "Registration failed");
    }
  }

  function clearStudentId() {
    localStorage.removeItem("studentId");
    setStudentId("");
    setEditingStudentId(true);
    setRegistrations([]);
    setQrTokens({});
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Upcoming Events</h1>

        <div className="flex gap-3 items-center">
          {!editingStudentId ? (
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-700">
                Student: <span className="font-medium">{studentId}</span>
              </div>
              <button onClick={() => setEditingStudentId(true)} className="text-xs px-3 py-1 border rounded">
                Edit
              </button>
              <button onClick={clearStudentId} className="text-xs px-3 py-1 border rounded">
                Clear
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                aria-label="student id"
                className="border px-2 py-1 rounded"
                placeholder="Enter student id (e.g. r001)"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
              <button onClick={saveStudentId} className="bg-indigo-600 text-white px-3 py-1 rounded">
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <input
          type="text"
          placeholder="Search events by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-1/2 border px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-400"
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border px-3 py-2 rounded-lg">
          <option value="">All types</option>
          <option>Workshop</option>
          <option>Fest</option>
          <option>Seminar</option>
          <option>Competition</option>
        </select>
        <input
          value={featureFilter}
          onChange={(e) => setFeatureFilter(e.target.value)}
          placeholder="Feature tag (e.g. certified)"
          className="border px-3 py-2 rounded-lg"
        />
        <div className="flex gap-2">
          <button
            onClick={() => loadEvents({ searchText: search, type: typeFilter, feature: featureFilter })}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
          >
            Apply
          </button>
          <button
            onClick={() => {
              setSearch("");
              setTypeFilter("");
              setFeatureFilter("");
              loadEvents({ searchText: "", type: "", feature: "" });
            }}
            className="bg-white border px-4 py-2 rounded-lg"
          >
            Reset
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-6 rounded shadow text-center">Loading events…</div>
      ) : events.length === 0 ? (
        <div className="bg-white p-6 rounded shadow text-center">No events found.</div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {events.map((e) => (
            <div key={e.event_id} className="bg-white rounded-lg shadow p-5 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1 truncate">{e.title}</h2>
                <div className="text-sm text-gray-500 mb-2">
                  {e.type} • {e.features ? <span className="text-indigo-600">{e.features}</span> : null}
                </div>
                <p className="text-sm text-gray-700 mb-3 line-clamp-3">{e.description}</p>
                <p className="text-xs text-gray-400">Starts: {e.starts_at ? new Date(e.starts_at).toLocaleString() : "—"}</p>
                {e.capacity !== null && (
                  <p className="text-xs text-gray-400">
                    Capacity: {e.capacity} | Registered: {e.registered_count ?? 0}
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-col items-start gap-3">
                {!qrTokens[e.event_id] ? (
                  <button onClick={() => onRegister(e.event_id)} className="bg-indigo-600 text-white px-3 py-2 rounded w-full">
                    Register
                  </button>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <div className="text-sm text-gray-600 mb-2">Registration QR (show this at check-in)</div>
                    <QRCodeCanvas value={qrTokens[e.event_id]} size={128} />
                    <div className="mt-2 text-xs text-gray-500">
                      Token: <span className="font-mono text-sm">{qrTokens[e.event_id]}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(qrTokens[e.event_id]);
                          toast.success("Token copied");
                        }}
                        className="text-xs px-3 py-1 border rounded"
                      >
                        Copy token
                      </button>
                      <button
                        onClick={() => {
                          setFbEvent(e);
                          setFbOpen(true);
                        }}
                        className="text-xs px-3 py-1 border rounded"
                      >
                        Give feedback
                      </button>
                    </div>
                  </div>
                )}

                {!qrTokens[e.event_id] && (
                  <button
                    onClick={() => {
                      setFbEvent(e);
                      setFbOpen(true);
                    }}
                    className="text-xs mt-2 px-2 py-1 border rounded"
                  >
                    Give feedback
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <MyRegistrations
        studentIdFromApp={studentId && !editingStudentId ? studentId : null}
        registrations={registrations}
        loadingRegs={loadingRegs}
        reload={() => {
          if (studentId) loadRegistrations(studentId);
        }}
      />

      <FeedbackModal
        open={fbOpen}
        event={fbEvent}
        studentId={studentId}
        onClose={() => setFbOpen(false)}
        onSubmitted={() => {
          loadEvents();
          if (studentId) loadRegistrations(studentId);
        }}
      />
    </div>
  );
}

/* ---------------- MyRegistrations component ---------------- */
function MyRegistrations({ studentIdFromApp, registrations: registrationsProp = [], loadingRegs = false, reload }) {
  const [studentId, setStudentId] = useState(studentIdFromApp || localStorage.getItem("studentId") || "");
  const [regs, setRegs] = useState(registrationsProp || []);
  const [loading, setLoading] = useState(loadingRegs);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (registrationsProp && registrationsProp.length) {
      setRegs(registrationsProp);
      setLoading(false);
    } else if (!studentIdFromApp && studentId) {
      loadRegs(studentId);
    } else if (studentIdFromApp) {
      loadRegs(studentIdFromApp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentIdFromApp]);

  async function loadRegs(id) {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const rows = await getRegistrationsForStudent(id);
      setRegs(rows || []);
    } catch (err) {
      console.error("getRegistrationsForStudent", err);
      setError(err.message || "Failed to load registrations");
      setRegs([]);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    const id = studentIdFromApp || studentId || localStorage.getItem("studentId");
    if (!id) return toast.error("Student id required");
    await loadRegs(id);
    if (typeof reload === "function") reload();
  }

  return (
    <section className="my-8 bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">My Registrations</h2>
        <div className="flex gap-2">
          <button onClick={refresh} className="bg-white border px-3 py-1 rounded">
            Refresh
          </button>
        </div>
      </div>

      {!studentIdFromApp && !studentId && <div className="mb-4 text-sm text-gray-600">Enter your student id at the top of the page to view your registrations.</div>}

      {error && <div className="text-red-600 mb-2">{error}</div>}

      {loading ? (
        <div>Loading your registrations…</div>
      ) : regs.length === 0 ? (
        <div className="text-sm text-gray-600">No registrations yet.</div>
      ) : (
        <div className="grid gap-3">
          {regs.map((r) => (
            <div key={r.reg_id} className="p-3 border rounded flex items-start justify-between">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.event_title || r.event_id}</div>
                <div className="text-xs text-gray-500">{r.event_type} • {r.event_starts_at ? new Date(r.event_starts_at).toLocaleString() : ""}</div>
                <div className="text-sm mt-2 text-gray-700 capitalize">{r.status || "registered"}</div>
              </div>

              <div className="ml-4 text-right">
                <div className="text-xs text-gray-500">Token</div>
                <div className="font-mono bg-gray-100 px-2 py-1 rounded mt-1">{r.token || "—"}</div>
                {r.token && (
                  <div className="mt-2 flex flex-col gap-2">
                    <QRCodeCanvas value={r.token} size={96} />
                    <button onClick={() => { navigator.clipboard?.writeText(r.token); toast.success("Token copied"); }} className="text-xs px-3 py-1 border rounded">
                      Copy token
                    </button>
                  </div>
                )}
                <a href={`/events/${r.event_id}`} className="inline-block mt-3 bg-indigo-600 text-white px-3 py-1 rounded text-sm">Open</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

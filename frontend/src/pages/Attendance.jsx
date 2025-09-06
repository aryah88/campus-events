// frontend/src/pages/Attendance.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  createEvent,
  getEvents,
  updateEvent,
  deleteEvent,
  markAttendanceByToken,
  markAttendance,
} from "../services/api";
import toast from "react-hot-toast";

export default function Attendance() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search / filter
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [featureFilter, setFeatureFilter] = useState("");
  const searchRef = useRef(null);

  // Create event form state
  const [title, setTitle] = useState("");
  const [etype, setEtype] = useState("Workshop");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");
  const [creating, setCreating] = useState(false);

  // Attendance states
  const [token, setToken] = useState("");
  const [manualEventId, setManualEventId] = useState("");
  const [manualStudentId, setManualStudentId] = useState("");
  const [marking, setMarking] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  async function load() {
    setLoading(true);
    try {
      const data = await getEvents({ collegeId: "c1", type: filterType, search, feature: featureFilter });
      setEvents(data);
      // auto-select first event for manual attendance if none selected
      if (!manualEventId && data && data.length) setManualEventId(data[0].event_id);
    } catch (err) {
      console.error(err);
      toast.error("Could not load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, featureFilter]);

  // debounce search
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => load(), 350);
    return () => clearTimeout(searchRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Create event
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title || !etype || !startsAt) return toast.error("Please fill title, type and start time");
    setCreating(true);
    try {
      const payload = {
        title,
        type: etype,
        starts_at: new Date(startsAt).toISOString(),
        description,
        capacity: capacity ? Number(capacity) : null,
        features,
        college_id: "c1",
      };
      const res = await createEvent(payload);
      toast.success(`Created ${res.event_id}`);
      setTitle(""); setEtype("Workshop"); setStartsAt(""); setCapacity(""); setDescription(""); setFeatures("");
      await load();
    } catch (err) {
      toast.error(err.message || "Create failed");
    } finally {
      setCreating(false);
    }
  };

  // Edit handlers
  const startEdit = (ev) => {
    setEditingId(ev.event_id);
    setEditValues({
      title: ev.title || "",
      type: ev.type || "",
      starts_at: ev.starts_at ? new Date(ev.starts_at).toISOString().slice(0,16) : "",
      capacity: ev.capacity || "",
      description: ev.description || "",
      features: ev.features || ""
    });
  };

  const saveEdit = async (eventId) => {
    try {
      const payload = {
        title: editValues.title,
        type: editValues.type,
        starts_at: new Date(editValues.starts_at).toISOString(),
        capacity: editValues.capacity ? Number(editValues.capacity) : null,
        description: editValues.description,
        features: editValues.features
      };
      await updateEvent(eventId, payload);
      toast.success("Updated");
      setEditingId(null);
      await load();
    } catch (err) {
      toast.error(err.message || "Update failed");
    }
  };

  const handleDelete = async (eventId) => {
    if (!confirm("Delete this event?")) return;
    try {
      await deleteEvent(eventId);
      toast.success("Deleted");
      await load();
    } catch (err) {
      toast.error(err.message || "Delete failed");
    }
  };

  // Attendance by token
  const handleMarkToken = async () => {
    if (!token) return toast.error("Enter token");
    try {
      const res = await markAttendanceByToken(token);
      toast.success(res.message || "Attendance marked");
      setToken("");
    } catch (err) {
      toast.error(err.message || "Attendance failed");
    }
  };

  // Manual attendance: select event + enter student id
  const handleManualMark = async () => {
    if (!manualEventId) return toast.error("Select an event");
    if (!manualStudentId || !manualStudentId.trim()) return toast.error("Enter student id");
    setMarking(true);
    try {
      const res = await markAttendance(manualEventId, manualStudentId.trim());
      toast.success(res.message || "Attendance marked");
      setManualStudentId("");
    } catch (err) {
      toast.error(err.message || "Attendance failed");
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin — Events & Attendance</h1>

      {/* Search/filter for admin */}
      <div className="bg-white p-4 rounded shadow flex gap-3 items-center">
        <input className="border p-2 rounded flex-1" placeholder="Search title..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="border p-2 rounded" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All types</option>
          <option>Workshop</option>
          <option>Seminar</option>
          <option>Fest</option>
          <option>Competition</option>
        </select>
        <input className="border p-2 rounded w-48" placeholder="Feature tag" value={featureFilter} onChange={(e) => setFeatureFilter(e.target.value)} />
        <button onClick={() => { setSearch(""); setFilterType(""); setFeatureFilter(""); load(); }} className="bg-white border px-3 py-2 rounded">Reset</button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create event */}
        <div className="bg-white p-6 rounded shadow">
          <h2 className="font-semibold mb-3">Create new event</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3">
            <input className="border p-2 rounded" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <select className="border p-2 rounded" value={etype} onChange={(e) => setEtype(e.target.value)}>
              <option>Workshop</option><option>Seminar</option><option>Fest</option><option>Competition</option><option>Other</option>
            </select>
            <input type="datetime-local" className="border p-2 rounded" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            <input className="border p-2 rounded" placeholder="Capacity (optional)" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            <input className="border p-2 rounded" placeholder="Features (comma-separated tags)" value={features} onChange={(e) => setFeatures(e.target.value)} />
            <textarea className="border p-2 rounded" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="flex gap-2">
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded" disabled={creating}>{creating ? "Creating..." : "Create Event"}</button>
              <button type="button" className="bg-white border px-4 py-2 rounded" onClick={() => { setTitle(""); setEtype("Workshop"); setStartsAt(""); setCapacity(""); setDescription(""); setFeatures(""); }}>Reset</button>
            </div>
          </form>
        </div>

        {/* Attendance panels */}
        <div className="space-y-4">
          {/* Manual attendance */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-3">Manual attendance (select event & student)</h2>
            <div className="flex flex-col gap-3">
              <select className="border p-2 rounded" value={manualEventId} onChange={(e) => setManualEventId(e.target.value)}>
                <option value="">-- select event --</option>
                {events.map((ev) => (
                  <option key={ev.event_id} value={ev.event_id}>
                    {ev.title} • {new Date(ev.starts_at).toLocaleString()}
                  </option>
                ))}
              </select>
              <input className="border p-2 rounded" placeholder="Student ID (e.g. stu1)" value={manualStudentId} onChange={(e) => setManualStudentId(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={handleManualMark} className="bg-indigo-600 text-white px-4 py-2 rounded" disabled={marking}>{marking ? "Marking..." : "Mark present"}</button>
                <button onClick={() => { setManualStudentId(""); }} className="bg-white border px-4 py-2 rounded">Clear</button>
              </div>
            </div>
          </div>

          {/* Token check-in */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-3">Attendance by registration token (QR)</h2>
            <div className="flex gap-2">
              <input className="border p-2 rounded flex-1" placeholder="registration token" value={token} onChange={(e) => setToken(e.target.value)} />
              <button onClick={handleMarkToken} className="bg-indigo-600 text-white px-4 py-2 rounded">Check-in</button>
            </div>
            <div className="text-xs text-gray-500 mt-2">Use the token shown to students after they register (QR).</div>
          </div>
        </div>
      </div>

      {/* Events list with edit/delete */}
      <div>
        {loading ? <div>Loading...</div> : events.length === 0 ? <div className="bg-white p-4 rounded shadow">No events.</div> : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((ev) => (
              <div key={ev.event_id} className="bg-white p-4 rounded shadow">
                {!editingId || editingId !== ev.event_id ? (
                  <>
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-semibold">{ev.title}</h3>
                        <div className="text-sm text-gray-500">{ev.type} • {new Date(ev.starts_at).toLocaleString()}</div>
                        <div className="text-sm mt-2">{ev.description}</div>
                        {ev.features && <div className="text-xs text-indigo-600 mt-2">Features: {ev.features}</div>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => startEdit(ev)} className="px-3 py-1 bg-white border rounded">Edit</button>
                        <button onClick={() => handleDelete(ev.event_id)} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input className="border p-2 rounded" value={editValues.title} onChange={(e) => setEditValues({...editValues, title: e.target.value})} />
                      <select className="border p-2 rounded" value={editValues.type} onChange={(e) => setEditValues({...editValues, type: e.target.value})}>
                        <option>Workshop</option><option>Seminar</option><option>Fest</option><option>Competition</option><option>Other</option>
                      </select>
                      <input type="datetime-local" className="border p-2 rounded" value={editValues.starts_at} onChange={(e) => setEditValues({...editValues, starts_at: e.target.value})} />
                      <input className="border p-2 rounded" value={editValues.capacity} onChange={(e) => setEditValues({...editValues, capacity: e.target.value})} />
                      <input className="border p-2 rounded col-span-1 md:col-span-2" value={editValues.features} onChange={(e) => setEditValues({...editValues, features: e.target.value})} />
                      <textarea className="border p-2 rounded col-span-1 md:col-span-2" value={editValues.description} onChange={(e) => setEditValues({...editValues, description: e.target.value})} />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => saveEdit(ev.event_id)} className="bg-indigo-600 text-white px-3 py-1 rounded">Save</button>
                      <button onClick={() => { setEditingId(null); setEditValues({}); }} className="bg-white border px-3 py-1 rounded">Cancel</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

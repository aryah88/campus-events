// frontend/src/pages/Reports.jsx
import React, { useEffect, useState } from "react";
import {
  getRegistrations,
  getAttendancePercentage,
  getTopActiveStudents,
  getAvgFeedback,
} from "../services/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import toast from "react-hot-toast";

const COLORS = ["#6366F1", "#06B6D4", "#F59E0B", "#EF4444", "#10B981", "#8B5CF6"];

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

export default function Reports() {
  const [registrations, setRegistrations] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [avgFeedback, setAvgFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [regs, att, students, fb] = await Promise.all([
        getRegistrations("c1"),
        getAttendancePercentage(""),
        getTopActiveStudents("c1", 8),
        getAvgFeedback("c1"),
      ]);
      setRegistrations(regs || []);
      setAttendance(att || []);
      setTopStudents(students || []);
      setAvgFeedback(fb || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Prepare chart data
  const regData = registrations.map((r) => ({
    name: r.title.length > 18 ? r.title.slice(0, 16) + "…" : r.title,
    registrations: r.registrations || 0,
  }));

  const attData = attendance.map((r) => ({
    name: r.title.length > 18 ? r.title.slice(0, 16) + "…" : r.title,
    attendance_pct: Number(r.attendance_pct) || 0,
  }));

  const fbData = avgFeedback.map((r) => ({
    name: r.title.length > 14 ? r.title.slice(0, 12) + "…" : r.title,
    value: r.avg_rating ? Number(r.avg_rating) : 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Reports</h1>
        <div className="flex gap-2">
          <button onClick={loadAll} className="bg-white border px-3 py-1 rounded shadow-sm hover:bg-gray-50">Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-6 rounded shadow text-center">Loading reports…</div>
      ) : (
        <>
          {/* 2x2 grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Registrations by Event">
              {regData.length === 0 ? (
                <div className="text-sm text-gray-500">No registration data.</div>
              ) : (
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="registrations" fill={COLORS[0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card title="Attendance Percentage">
              {attData.length === 0 ? (
                <div className="text-sm text-gray-500">No attendance data.</div>
              ) : (
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis unit="%" domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="attendance_pct" fill={COLORS[1]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card title="Top Active Students">
              {topStudents.length === 0 ? (
                <div className="text-sm text-gray-500">No student data.</div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-gray-500 border-b">
                      <tr><th className="py-2">Student</th><th className="py-2">Roll</th><th className="py-2">Attended</th></tr>
                    </thead>
                    <tbody>
                      {topStudents.map((s, idx) => (
                        <tr key={s.student_id || idx} className="border-b last:border-0">
                          <td className="py-2">{s.name || s.student_id}</td>
                          <td className="py-2">{s.roll_no || "-"}</td>
                          <td className="py-2 font-medium">{s.attended_events}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card title="Average Feedback">
              <div className="flex gap-4 items-center">
                <div style={{ width: 140, height: 140 }}>
                  {fbData.length === 0 ? (
                    <div className="text-sm text-gray-500">No feedback</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={fbData.slice(0, 6)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} labelLine={false}>
                          {fbData.slice(0, 6).map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {avgFeedback.length === 0 ? (
                    <div className="text-sm text-gray-500">No feedback available.</div>
                  ) : (
                    <div className="space-y-2">
                      {avgFeedback.slice(0, 6).map((f, i) => (
                        <div key={f.event_id || i} className="flex items-center justify-between border-b pb-2">
                          <div className="truncate">
                            <div className="text-sm font-medium">{f.title}</div>
                            <div className="text-xs text-gray-500">{f.feedback_count || 0} reviews</div>
                          </div>
                          <div className="text-lg font-semibold ml-4">{f.avg_rating ?? "—"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Summary row */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded shadow text-sm"><div className="font-medium">Total events</div><div className="text-2xl">{registrations.length}</div></div>
            <div className="bg-white p-3 rounded shadow text-sm"><div className="font-medium">Avg attendance %</div>
              <div className="text-2xl">{attendance.length ? `${(attendance.reduce((s,r)=>s+(Number(r.attendance_pct)||0),0)/attendance.length).toFixed(1)}%` : "—"}</div>
            </div>
            <div className="bg-white p-3 rounded shadow text-sm"><div className="font-medium">Active students</div><div className="text-2xl">{topStudents.length}</div></div>
            <div className="bg-white p-3 rounded shadow text-sm"><div className="font-medium">Avg rating</div>
              <div className="text-2xl">{avgFeedback.length ? (avgFeedback.reduce((s,f)=>s+(f.avg_rating||0),0)/avgFeedback.length).toFixed(2) : "—"}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// frontend/src/App.jsx
import React, { useEffect, useState } from "react";
import Home from "./pages/Home";
import Attendance from "./pages/Attendance";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import toast from "react-hot-toast";
import { whoami, logout as apiLogout } from "./services/api";

export default function App() {
  const [user, setUser] = useState({ authenticated: false, role: null, email: null });
  const [page, setPage] = useState("landing");
  const [loading, setLoading] = useState(true); // show loader while whoami runs

  // runs at app start and when you want to refresh auth state
  const refreshAuth = async () => {
    setLoading(true);
    try {
      const res = await whoami();
      if (res && res.authenticated) {
        setUser({ authenticated: true, role: res.role, email: res.email });
        setPage(res.role === "admin" ? "attendance" : "home");
      } else {
        setUser({ authenticated: false, role: null, email: null });
        setPage("landing");
      }
    } catch (err) {
      console.error("whoami error", err);
      setUser({ authenticated: false, role: null, email: null });
      setPage("landing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep UI consistent after login/signup flows
  useEffect(() => {
    if (user.authenticated) {
      if (page === "login" || page === "signup" || page === "landing") {
        setPage(user.role === "admin" ? "attendance" : "home");
      }
    }
  }, [user, page]);

  const handleAuth = async () => {
    // called by Login/Signup when they succeed
    try {
      await refreshAuth();
      toast.success(`Signed in as ${user.email || ""}`);
    } catch (err) {
      toast.error("Auth failed");
    }
  };

  const doLogout = async () => {
    setLoading(true);
    try {
      await apiLogout();
      setUser({ authenticated: false, role: null, email: null });
      setPage("landing");
      toast.success("Logged out");
    } catch (err) {
      console.error("logout error", err);
      toast.error("Logout failed");
    } finally {
      setLoading(false);
    }
  };

  const NavButton = ({ children, to, show = true }) =>
    !show ? null : (
      <button
        onClick={() => setPage(to)}
        className={`px-3 py-1 rounded ${page === to ? "bg-white text-indigo-700" : "hover:bg-white/10"}`}
      >
        {children}
      </button>
    );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="text-center p-6 bg-white rounded shadow">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="bg-indigo-600 text-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-white/20 flex items-center justify-center text-xl font-bold">🎓</div>
            <div>
              <div className="text-lg font-semibold">Campus Events</div>
              <div className="text-xs opacity-80">Student & Admin portals</div>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <NavButton to="home" show={user.authenticated && user.role === "student"}>
              Events
            </NavButton>
            <NavButton to="attendance" show={user.authenticated && user.role === "admin"}>
              Admin
            </NavButton>
            <NavButton to="reports" show={user.authenticated && user.role === "admin"}>
              Reports
            </NavButton>

            {!user.authenticated && <NavButton to="login">Login</NavButton>}
            {!user.authenticated && <NavButton to="signup">Signup</NavButton>}

            {user.authenticated && (
              <div className="flex items-center gap-3">
                <div className="text-sm">{user.email}</div>
                <button onClick={doLogout} className="px-3 py-1 bg-white/10 rounded">
                  Logout
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="py-8 max-w-6xl mx-auto px-4">
        {/* Landing */}
        {!user.authenticated && page === "landing" && (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="max-w-3xl text-center bg-white/80 p-10 rounded-xl shadow-lg">
              <h1 className="text-3xl font-extrabold">Welcome to Campus Events</h1>
              <p className="mt-3 text-gray-600">Signup or login to continue.</p>
              <div className="mt-6">
                <button onClick={() => setPage("login")} className="px-6 py-3 rounded-lg bg-indigo-600 text-white mr-3">
                  Login
                </button>
                <button onClick={() => setPage("signup")} className="px-6 py-3 rounded-lg border border-indigo-600 text-indigo-600">
                  Signup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pages */}
        {page === "home" && <Home />}
        {page === "attendance" && user.authenticated && user.role === "admin" && <Attendance />}
        {page === "reports" && user.authenticated && user.role === "admin" && (
          <React.Suspense fallback={<div>Loading...</div>}>
            <Reports />
          </React.Suspense>
        )}

        {/* Login / Signup flows */}
        {page === "login" && !user.authenticated && <Login onAuth={handleAuth} />}
        {page === "signup" && !user.authenticated && <Signup onAuth={handleAuth} />}
      </main>
    </div>
  );
}

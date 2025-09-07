// frontend/src/pages/Login.jsx
import React, { useState } from "react";
import { login } from "../services/api";
import toast from "react-hot-toast";

export default function Login({ onAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // frontend/src/pages/Login.jsx (update)
const handleSubmit = async (e) => {
  e.preventDefault();
  if (!email || !password) return alert("Enter email & password");
  setLoading(true);
  try {
    // Trim & lower the email before sending
    const cleanEmail = email.trim().toLowerCase();
    const res = await login(cleanEmail, password);
    console.log("login res", res);
    navigate("/events");
  } catch (err) {
    console.error("login error", err);
    alert(err.message || "Login failed");
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="container mx-auto max-w-md mt-20 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Sign in</h2>
      <form onSubmit={handleSubmit}>
        <input
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
        <input
          className="input mt-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button className="btn mt-4" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

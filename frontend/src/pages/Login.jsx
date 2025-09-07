// frontend/src/pages/Login.jsx
import React, { useState } from "react";
import { login } from "../services/api";
import toast from "react-hot-toast";

export default function Login({ onAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Enter email & password");
    setLoading(true);
    try {
      // Trim & lower the email before sending
      const cleanEmail = email.trim().toLowerCase();
      const res = await login(cleanEmail, password);
      console.log("login res", res);
      toast.success("Login successful!");
      // Call the onAuth callback to trigger auth refresh in App.jsx
      if (onAuth) onAuth();
    } catch (err) {
      console.error("login error", err);
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="container mx-auto max-w-md mt-20 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Sign in</h2>
      <form onSubmit={handleSubmit}>
        <input
          className="w-full border px-3 py-2 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
        <input
          className="w-full border px-3 py-2 rounded mt-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded mt-4" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

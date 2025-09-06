import React, { useState } from "react";
import { login } from "../services/api";
import toast from "react-hot-toast";

export default function Login({ onAuth }) {
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email,password);
      toast.success("Welcome");
      onAuth && onAuth();
    } catch (err) { toast.error(err.message || "Login failed"); }
  };
  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-4">Sign in</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="border p-2 rounded w-full" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="border p-2 rounded w-full" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="bg-indigo-600 text-white px-4 py-2 rounded w-full">Sign in</button>
      </form>
    </div>
  );
}

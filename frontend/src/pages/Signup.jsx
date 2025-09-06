import React, { useState } from "react";
import { signup } from "../services/api";
import toast from "react-hot-toast";

export default function Signup({ onAuth }) {
  const [email,setEmail] = useState("");
  const [name,setName] = useState("");
  const [password,setPassword] = useState("");
  const [role,setRole] = useState("student");
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signup(email,name,password,role);
      toast.success("Account created");
      onAuth && onAuth();
    } catch (err) { toast.error(err.message || "Signup failed"); }
  };
  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-4">Sign up</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="border p-2 rounded w-full" type="text" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} />
        <input className="border p-2 rounded w-full" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="border p-2 rounded w-full" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <select className="border p-2 rounded w-full" value={role} onChange={(e)=>setRole(e.target.value)}><option value="student">Student</option><option value="admin">Admin</option></select>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded w-full">Sign up</button>
      </form>
    </div>
  );
}

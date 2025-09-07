// frontend/src/pages/Signup.jsx
import React, { useState, useEffect } from "react";
import { signup } from "../services/api";
import { QRCodeCanvas } from "qrcode.react";
import toast from "react-hot-toast";

/**
 * Polished Signup page.
 *
 * - To make "Open in Expo" work automatically, set VITE_EXPO_URL in your .env
 *   example: VITE_EXPO_URL=exp://192.168.202.180:19000
 *
 * - Otherwise copy the "Expo URL" from Metro (npx expo start) and paste it
 *   into the Expo URL field below — the QR will update and scanning it with
 *   Expo Go will open the app on your phone.
 */

export default function Signup({ onAuth }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);

  // expo link field (dev URL) - try environment var first
  const envExpo = import.meta.env.VITE_EXPO_URL || "";
  const [expoUrl, setExpoUrl] = useState(envExpo);

  // app store / playstore fallback url (change to your published app or Expo publish url)
  const APP_STORE_URL = import.meta.env.VITE_APP_STORE_URL || "https://your-download-or-expo-link.example.com";

  useEffect(() => {
    // If VITE_EXPO_URL present, keep it
    if (envExpo) setExpoUrl(envExpo);
  }, [envExpo]);

  const tryOpenApp = (url) => {
    if (!url) return;
    // attempt to open the dev client / expo url
    window.location.href = url;
    // as a fallback after delay, open web student page
    setTimeout(() => {
      // fallback student page (web)
      window.location.href = "/student-app";
    }, 1200);
  };

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      await signup(email.trim(), name.trim(), password, role);
      toast.success("Account created");

      // If a parent wants to know about auth change
      onAuth && onAuth();

      if (role === "student") {
        // prefer Expo dev URL (so people with Expo Go can open app)
        if (expoUrl && expoUrl.startsWith("exp://")) {
          tryOpenApp(expoUrl);
        } else {
          // try deep link (if you registered scheme). Otherwise send to web student page.
          const deep = import.meta.env.VITE_APP_DEEPLINK || "myapp://events";
          if (deep) {
            tryOpenApp(deep);
          } else {
            window.location.href = "/student-app";
          }
        }
      } else {
        // teacher -> web teacher dashboard (change route as needed)
        window.location.href = "/teacher-dashboard";
      }
    } catch (err) {
      console.error("signup error", err);
      toast.error(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-12 bg-white/80 p-8 rounded-xl shadow-lg">
      <div className="flex items-start gap-6">
        <div className="flex-1">
          <h2 className="text-2xl font-extrabold mb-2">Create account</h2>
          <p className="text-sm text-gray-600 mb-6">Choose student for the mobile app, teacher for the web dashboard.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Sign up as</label>
              <div className="mt-2 flex items-center gap-6">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="role" value="student" checked={role === "student"} onChange={() => setRole("student")} className="form-radio" />
                  <span>Student</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="role" value="teacher" checked={role === "teacher"} onChange={() => setRole("teacher")} className="form-radio" />
                  <span>Teacher</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="Your name (optional)" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="you@example.com" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="mt-1 block w-full border rounded px-3 py-2" placeholder="Choose a secure password" />
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded shadow">
                {loading ? "Creating..." : "Sign up"}
              </button>
              <button type="button" onClick={() => { setEmail(""); setName(""); setPassword(""); }} className="px-4 py-2 border rounded">
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Right column: App install / Expo dev QR */}
        <aside className="w-72 pl-6">
          <div className="mb-4">
            <h4 className="font-semibold">Open mobile app</h4>
            <p className="text-xs text-gray-500">If you have Expo Go, paste the Expo dev URL (from Metro) below or use the QR.</p>
          </div>

          <label className="block text-xs text-gray-600 mb-1">Expo dev URL</label>
          <input
            value={expoUrl}
            onChange={(e) => setExpoUrl(e.target.value)}
            placeholder="exp://192.168.x.x:19000"
            className="mb-3 block w-full border rounded px-2 py-1 text-sm"
          />

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                if (!expoUrl) return toast.error("Paste the Expo dev URL first");
                tryOpenApp(expoUrl);
              }}
              className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded text-sm"
            >
              Open in Expo
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(expoUrl || APP_STORE_URL);
                toast.success("Copied");
              }}
              className="px-3 py-2 bg-gray-100 rounded text-sm"
            >
              Copy
            </button>
          </div>

          <div className="bg-white p-3 rounded border">
            <div className="mb-2 text-xs text-gray-600">Expo QR</div>
            <div className="flex justify-center items-center">
              {expoUrl ? (
                <QRCodeCanvas value={expoUrl} size={140} />
              ) : (
                <div className="text-xs text-gray-400">Paste Expo URL to generate QR</div>
              )}
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-600">
            <div className="mb-2">Install (fallback)</div>
            <div className="bg-white p-2 rounded border flex items-center gap-2">
              <div className="flex-1">
                <div className="text-sm font-medium">App / Play Store</div>
                <a href={APP_STORE_URL} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 break-words">{APP_STORE_URL}</a>
              </div>
              <div>
                <QRCodeCanvas value={APP_STORE_URL} size={56} />
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-6 text-sm text-gray-500">
        Tip: To get the Expo dev URL open the Metro bundler (`npx expo start`) and copy the URL shown there. Paste it above so scanning the QR opens the app in Expo Go.
      </div>
    </div>
  );
}

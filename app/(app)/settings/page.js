"use client";

import { useEffect, useState } from "react";
import { apiFetch, getStaff, setSession, getToken } from "@/lib/api";

export default function SettingsPage() {
  const [staff, setStaff] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [form, setForm] = useState({
    name: "",
    currentPassword: "",
    newPassword: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [me, status] = await Promise.all([
          apiFetch("/api/auth/me"),
          apiFetch("/api/ai/status"),
        ]);
        setStaff(me.staff);
        setAiStatus(status);
        setForm((prev) => ({ ...prev, name: me.staff.name }));
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, []);

  function update(field) {
    return (event) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await apiFetch("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setStaff(result.staff);
      setSession(getToken(), result.staff);
      setForm((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
      }));
      setNotice("Your profile was updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your account and check the AI configuration.
        </p>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Your profile
          </h2>

          <div className="mb-4">
            <label className="label">Name</label>
            <input
              className="field"
              value={form.name}
              onChange={update("name")}
            />
          </div>

          <div className="mb-4">
            <label className="label">Email</label>
            <input className="field" value={staff ? staff.email : ""} disabled />
          </div>

          <hr className="my-4 border-slate-200" />
          <p className="mb-3 text-sm text-slate-500">
            Leave the password fields empty to keep your current password.
          </p>

          <div className="mb-4">
            <label className="label">Current password</label>
            <input
              type="password"
              className="field"
              value={form.currentPassword}
              onChange={update("currentPassword")}
            />
          </div>
          <div className="mb-4">
            <label className="label">New password</label>
            <input
              type="password"
              className="field"
              value={form.newPassword}
              onChange={update("newPassword")}
              placeholder="At least 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? "Saving..." : "Save profile"}
          </button>
        </form>

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            AI status
          </h2>
          {aiStatus === null ? (
            <p className="text-sm text-slate-500">Checking...</p>
          ) : aiStatus.configured ? (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-semibold">AI is configured.</p>
              <ul className="mt-2 space-y-2">
                {aiStatus.providers.map((p) => (
                  <li key={p.id}>
                    <span className="font-medium">{p.label}</span> — {p.model}
                    <span className="block text-xs text-green-700">
                      {p.baseUrl}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">AI is not configured.</p>
              <p className="mt-1">
                To enable AI CV generation, open the backend <code>.env</code>{" "}
                file and add a key for at least one provider:
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-white px-3 py-2 text-xs">
{`# Google Gemini
GEMINI_API_KEY=your-gemini-key

# Anthropic Claude
CLAUDE_API_KEY=your-claude-key`}
              </pre>
              <p className="mt-2">
                Then restart the backend. Keys stay on the server and are never
                sent to the browser.
              </p>
            </div>
          )}

          <h2 className="mt-6 mb-2 text-lg font-semibold text-slate-900">
            Notes
          </h2>
          <ul className="list-disc pl-5 text-sm text-slate-600">
            <li>Generated PDFs are stored privately in the database.</li>
            <li>Client data lives in the MySQL database “epress_cv_studio”.</li>
            <li>API keys and passwords never leave the backend.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

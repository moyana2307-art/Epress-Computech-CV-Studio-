"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getToken, setSession } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" or "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // If the person is already signed in, go straight to the dashboard.
  // Otherwise ask the backend whether the first account has been created.
  useEffect(() => {
    if (getToken()) {
      router.replace("/");
      return;
    }
    apiFetch("/api/auth/status")
      .then((status) => {
        if (!status.hasStaff) setMode("register");
      })
      .catch(() => {
        setError(
          "Cannot reach the backend. Make sure it is running (npm run server)."
        );
      });
  }, [router]);

  function update(field) {
    return (event) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const path =
        mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body =
        mode === "register"
          ? form
          : { email: form.email, password: form.password };

      const result = await apiFetch(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setSession(result.token, result.staff);
      router.replace("/");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">
            E
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Epress CV Studio
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isRegister
              ? "Create the first staff account to get started."
              : "Sign in to manage client CVs."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6">
          {isRegister ? (
            <div className="mb-4">
              <label className="label" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                className="field"
                value={form.name}
                onChange={update("name")}
                placeholder="e.g. Tariro Moyo"
                required
              />
            </div>
          ) : null}

          <div className="mb-4">
            <label className="label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              className="field"
              value={form.email}
              onChange={update("email")}
              placeholder="you@epress.co.zw"
              required
            />
          </div>

          <div className="mb-4">
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="field"
              value={form.password}
              onChange={update("password")}
              placeholder={isRegister ? "At least 8 characters" : "Your password"}
              required
            />
          </div>

          {error ? (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy
              ? "Please wait..."
              : isRegister
              ? "Create account"
              : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Staff only. Client information is private and must not be shared.
        </p>
      </div>
    </div>
  );
}

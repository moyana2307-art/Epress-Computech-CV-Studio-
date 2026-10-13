"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

const EMPTY_FORM = { full_name: "", phone: "", email: "" };

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (searchText) => {
    setLoading(true);
    setError("");
    try {
      const query = searchText ? `?search=${encodeURIComponent(searchText)}` : "";
      const result = await apiFetch(`/api/clients${query}`);
      setClients(result.clients);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  function handleSearch(event) {
    event.preventDefault();
    load(search.trim());
  }

  function update(field) {
    return (event) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleAdd(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/clients", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load(search.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
          <p className="mt-1 text-sm text-slate-500">
            Add clients and open their profiles to view saved CVs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {showForm ? "Close form" : "+ Add client"}
        </button>
      </div>

      {showForm ? (
        <form onSubmit={handleAdd} className="card mb-6 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            New client
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Full name</label>
              <input
                className="field"
                value={form.full_name}
                onChange={update("full_name")}
                placeholder="e.g. Jane Doe"
                required
              />
            </div>
            <div>
              <label className="label">Phone number</label>
              <input
                className="field"
                value={form.phone}
                onChange={update("phone")}
                placeholder="e.g. 0771 234 567"
              />
            </div>
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="field"
                value={form.email}
                onChange={update("email")}
                placeholder="e.g. jane@example.com"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save client"}
          </button>
        </form>
      ) : null}

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          className="field"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or phone number"
        />
        <button
          type="submit"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Search
        </button>
      </form>

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Documents</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>
                  Loading clients...
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>
                  No clients found.
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {client.full_name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {client.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {client.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {client.document_count}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      Open profile
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

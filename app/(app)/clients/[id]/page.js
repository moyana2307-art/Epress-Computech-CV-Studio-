"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, downloadDocumentPdf } from "@/lib/api";

const FIELDS = [
  { key: "full_name", label: "Full name", type: "text", required: true },
  { key: "phone", label: "Phone number", type: "text" },
  { key: "email", label: "Email address", type: "email" },
  { key: "target_job_title", label: "Target job title", type: "text" },
];

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id;

  const [client, setClient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch(`/api/clients/${clientId}`);
      setClient(result.client);
      setDocuments(result.documents);
      setForm({
        full_name: result.client.full_name || "",
        phone: result.client.phone || "",
        email: result.client.email || "",
        target_job_title: result.client.target_job_title || "",
        job_description: result.client.job_description || "",
        raw_information: result.client.raw_information || "",
        notes: result.client.notes || "",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  function update(field) {
    return (event) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await apiFetch(`/api/clients/${clientId}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setClient(result.client);
      setNotice("Client information saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload(doc) {
    try {
      await downloadDocumentPdf(doc.id, `cv-${doc.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this client and all their documents?")) return;
    try {
      await apiFetch(`/api/clients/${clientId}`, { method: "DELETE" });
      router.replace("/clients");
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="text-slate-500">Loading client...</p>;
  if (!client || !form) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {error || "Client not found."}
      </p>
    );
  }

  return (
    <div>
      <Link href="/clients" className="text-sm text-blue-600 hover:underline">
        &larr; Back to clients
      </Link>

      <div className="mt-3 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {client.full_name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Client since {formatDate(client.created_at)}
          </p>
        </div>
        <Link
          href={`/create?client=${client.id}`}
          className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Create CV for this client
        </Link>
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
        <form onSubmit={handleSave} className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Client information
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.key}>
                <label className="label">{field.label}</label>
                <input
                  type={field.type}
                  className="field"
                  value={form[field.key]}
                  onChange={update(field.key)}
                  required={field.required}
                />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="label">Job description (optional)</label>
            <textarea
              className="field h-24"
              value={form.job_description}
              onChange={update("job_description")}
              placeholder="Paste the job advert so the CV can be tailored."
            />
          </div>

          <div className="mt-4">
            <label className="label">
              Collected information (education, work history, skills...)
            </label>
            <textarea
              className="field h-40"
              value={form.raw_information}
              onChange={update("raw_information")}
              placeholder="Paste everything the client gave you here."
            />
          </div>

          <div className="mt-4">
            <label className="label">Internal notes</label>
            <textarea
              className="field h-20"
              value={form.notes}
              onChange={update("notes")}
            />
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete client
            </button>
          </div>
        </form>

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Saved documents
          </h2>
          {documents.length === 0 ? (
            <p className="text-sm text-slate-500">No documents saved yet.</p>
          ) : (
            <ul className="space-y-3">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {doc.title || `${doc.document_type} #${doc.id}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      v{doc.current_version} • {formatDate(doc.updated_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/create?document=${doc.id}`}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Edit / new version
                    </Link>
                    {doc.has_pdf ? (
                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Download PDF
                      </button>
                    ) : (
                      <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-500">
                        No PDF
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, downloadDocumentPdf } from "@/lib/api";
import { templateName } from "@/lib/cvHelpers";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (searchText) => {
    setLoading(true);
    setError("");
    try {
      const query = searchText
        ? `?search=${encodeURIComponent(searchText)}`
        : "";
      const result = await apiFetch(`/api/documents${query}`);
      setDocuments(result.documents);
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

  async function handleDownload(doc) {
    try {
      await downloadDocumentPdf(doc.id, `cv-${doc.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Saved Documents
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            All CVs and cover letters you have saved.
          </p>
        </div>
        <Link
          href="/create"
          className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Create new CV
        </Link>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          className="field"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by title or client name"
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
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Template</th>
              <th className="px-4 py-3 font-medium">Version</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={7}>
                  Loading documents...
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={7}>
                  No documents found.
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {doc.title || `${doc.document_type} #${doc.id}`}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{doc.client_name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {doc.document_type === "cover_letter" ? "Cover letter" : "CV"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {templateName(doc.template)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    v{doc.current_version}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(doc.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/create?document=${doc.id}`}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Edit
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (!data) {
    return <p className="text-slate-500">Loading dashboard...</p>;
  }

  const stats = [
    { label: "Total clients", value: data.totalClients, href: "/clients" },
    { label: "Total documents", value: data.totalDocuments, href: "/documents" },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            A quick overview of your clients and documents.
          </p>
        </div>
        <Link
          href="/create"
          className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Create new CV
        </Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="card p-5">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-blue-700">
              {stat.value}
            </p>
          </Link>
        ))}

        <Link href="/clients" className="card p-5">
          <p className="text-sm text-slate-500">Quick link</p>
          <p className="mt-2 font-medium text-slate-900">Manage clients</p>
        </Link>
        <Link href="/documents" className="card p-5">
          <p className="text-sm text-slate-500">Quick link</p>
          <p className="mt-2 font-medium text-slate-900">Saved documents</p>
        </Link>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Recently created CVs
        </h2>
        {data.recentDocuments.length === 0 ? (
          <p className="text-sm text-slate-500">
            No documents yet. Click “Create new CV” to make the first one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4 font-medium">Title</th>
                  <th className="py-2 pr-4 font-medium">Client</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Version</th>
                  <th className="py-2 pr-4 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.recentDocuments.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      {doc.title || `${doc.document_type} #${doc.id}`}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {doc.client_name}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {doc.document_type === "cover_letter" ? "Cover letter" : "CV"}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      v{doc.current_version}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {formatDate(doc.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

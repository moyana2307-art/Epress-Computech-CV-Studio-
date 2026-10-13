"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { TEMPLATES, emptyCv, normalizeCv } from "@/lib/cvHelpers";
import { exportElementToPdf, downloadBlob } from "@/lib/pdf";
import CvEditor from "@/components/CvEditor";
import CVPreview from "@/components/CVPreview";

const EMPTY_CLIENT_FORM = {
  full_name: "",
  phone: "",
  email: "",
  target_job_title: "",
  job_description: "",
  raw_information: "",
  notes: "",
};

export default function CreateCvPage() {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [clientForm, setClientForm] = useState(EMPTY_CLIENT_FORM);
  const [cv, setCv] = useState(emptyCv());
  const [template, setTemplate] = useState("modern");
  const [title, setTitle] = useState("");
  const [documentId, setDocumentId] = useState(null);

  const [aiStatus, setAiStatus] = useState({ configured: false });
  const [provider, setProvider] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // On first load: get the client list, AI status, and handle URL options
  // like /create?client=3 or /create?document=5.
  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const [clientList, status] = await Promise.all([
          apiFetch("/api/clients"),
          apiFetch("/api/ai/status"),
        ]);
        if (cancelled) return;
        setClients(clientList.clients);
        setAiStatus(status);
        setProvider(
          status.defaultProvider || (status.providers?.[0]?.id ?? "")
        );

        const query = new URLSearchParams(window.location.search);
        const clientParam = query.get("client");
        const documentParam = query.get("document");

        if (documentParam) {
          const result = await apiFetch(`/api/documents/${documentParam}`);
          if (cancelled) return;
          const doc = result.document;
          setDocumentId(doc.id);
          setTemplate(doc.template || "modern");
          setTitle(doc.title || "");
          setCv(normalizeCv(doc.content));
          await loadClient(doc.client_id);
        } else if (clientParam) {
          await loadClient(clientParam);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadClient(id) {
    setClientId(String(id));
    const result = await apiFetch(`/api/clients/${id}`);
    const c = result.client;
    setClientForm({
      full_name: c.full_name || "",
      phone: c.phone || "",
      email: c.email || "",
      target_job_title: c.target_job_title || "",
      job_description: c.job_description || "",
      raw_information: c.raw_information || "",
      notes: c.notes || "",
    });
    setCv((prev) => ({
      ...prev,
      fullName: prev.fullName || c.full_name || "",
      email: prev.email || c.email || "",
      phone: prev.phone || c.phone || "",
      targetJobTitle: prev.targetJobTitle || c.target_job_title || "",
    }));
  }

  function updateClient(field) {
    return (event) =>
      setClientForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSelectClient(event) {
    const id = event.target.value;
    setError("");
    if (!id) {
      setClientId("");
      return;
    }
    try {
      await loadClient(id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveClient() {
    if (!clientId) {
      setError("Please choose or add a client first.");
      return;
    }
    setBusy("client");
    setError("");
    setNotice("");
    try {
      await apiFetch(`/api/clients/${clientId}`, {
        method: "PUT",
        body: JSON.stringify(clientForm),
      });
      setNotice("Client information saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function handleGenerate() {
    setBusy("ai");
    setError("");
    setNotice("");
    try {
      const result = await apiFetch("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({
          rawInformation: clientForm.raw_information,
          targetJobTitle: clientForm.target_job_title,
          jobDescription: clientForm.job_description,
          clientName: clientForm.full_name,
          provider: provider || undefined,
        }),
      });
      setCv(normalizeCv(result.cv));
      if (!title) {
        setTitle(`${clientForm.full_name || "Client"} CV`);
      }
      setNotice("Draft generated. Please review and edit before saving.");
    } catch (err) {
      if (err.code === "AI_NOT_CONFIGURED") {
        setError(
          "AI is not configured yet. Add a provider key (GEMINI_API_KEY or " +
            "CLAUDE_API_KEY) to the backend .env file and restart the server. " +
            "You can still edit the CV manually below."
        );
      } else {
        setError(err.message);
      }
    } finally {
      setBusy("");
    }
  }

  // Build the PDF from the preview and return its base64 data.
  async function buildPdf() {
    const element = window.document.getElementById("cv-preview");
    const { dataUri, blob } = await exportElementToPdf(element);
    return { dataUri, blob };
  }

  async function handleDownload() {
    setBusy("pdf");
    setError("");
    try {
      const { blob } = await buildPdf();
      const name = (cv.fullName || "cv").replace(/\s+/g, "-").toLowerCase();
      downloadBlob(blob, `${name}-cv.pdf`);
    } catch (err) {
      setError("Could not create the PDF: " + err.message);
    } finally {
      setBusy("");
    }
  }

  async function handleSave() {
    if (!clientId) {
      setError("Please choose a client before saving.");
      return;
    }
    setBusy("save");
    setError("");
    setNotice("");
    try {
      // Generate the PDF so the saved file matches the approved content.
      let pdfBase64 = null;
      try {
        const { dataUri } = await buildPdf();
        pdfBase64 = dataUri;
      } catch (pdfError) {
        // Saving still works without a PDF; staff can attach one later.
      }

      const payload = {
        client_id: clientId,
        document_type: "cv",
        template,
        title: title || `${cv.fullName || "Client"} CV`,
        content: cv,
        pdfBase64,
      };

      if (documentId) {
        await apiFetch(`/api/documents/${documentId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNotice("Saved as a new version.");
      } else {
        const result = await apiFetch("/api/documents", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setDocumentId(result.document.id);
        setNotice("Document saved to the client.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Create CV</h1>
        <p className="mt-1 text-sm text-slate-500">
          Choose a client, paste their information, generate a draft, then
          review and save.
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

      {/* Step 1: the client and the raw information */}
      <section className="card mb-6 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          1. Client and collected information
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Client</label>
            <select
              className="field"
              value={clientId}
              onChange={handleSelectClient}
            >
              <option value="">— Select a client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              No client yet? Add one on the{" "}
              <Link href="/clients" className="text-blue-600 hover:underline">
                Clients
              </Link>{" "}
              page first.
            </p>
          </div>
          <div>
            <label className="label">Target job title</label>
            <input
              className="field"
              value={clientForm.target_job_title}
              onChange={updateClient("target_job_title")}
              placeholder="e.g. Marketing Officer"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Full name</label>
            <input
              className="field"
              value={clientForm.full_name}
              onChange={updateClient("full_name")}
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="field"
              value={clientForm.phone}
              onChange={updateClient("phone")}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="field"
              value={clientForm.email}
              onChange={updateClient("email")}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Paste the client&apos;s information</label>
          <textarea
            className="field h-44"
            value={clientForm.raw_information}
            onChange={updateClient("raw_information")}
            placeholder={
              "Paste education, employment history, skills, qualifications, " +
              "certificates, projects and references here."
            }
          />
        </div>

        <div className="mt-4">
          <label className="label">Job description (optional)</label>
          <textarea
            className="field h-24"
            value={clientForm.job_description}
            onChange={updateClient("job_description")}
            placeholder="Paste the job advert to tailor the CV."
          />
        </div>

        <button
          type="button"
          onClick={handleSaveClient}
          disabled={!clientId || busy === "client"}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {busy === "client" ? "Saving..." : "Save client information"}
        </button>
      </section>

      {/* Step 2: generate */}
      <section className="card mb-6 p-6">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">
          2. Generate the draft
        </h2>
        {aiStatus.configured ? (
          <>
            {aiStatus.providers && aiStatus.providers.length > 1 ? (
              <div className="mb-4 max-w-sm">
                <label className="label">AI provider</label>
                <select
                  className="field"
                  value={provider}
                  onChange={(event) => setProvider(event.target.value)}
                >
                  {aiStatus.providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} — {p.model}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <p className="mb-4 text-sm text-slate-500">
              AI is ready
              {aiStatus.providers && aiStatus.providers.length === 1
                ? ` using ${aiStatus.providers[0].label} (${aiStatus.providers[0].model})`
                : ""}
              . The assistant organises the notes, fixes grammar and never
              invents details.
            </p>
          </>
        ) : (
          <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">AI is not configured yet.</p>
            <p>
              Add a provider key (<code>GEMINI_API_KEY</code> or{" "}
              <code>CLAUDE_API_KEY</code>) to the backend <code>.env</code> file
              and restart the server to enable one-click generation. Until then,
              you can still build the CV manually below.
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!aiStatus.configured || busy === "ai"}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy === "ai" ? "Generating..." : "Generate with AI"}
          </button>
          <button
            type="button"
            onClick={() => setCv(emptyCv())}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Clear and write manually
          </button>
        </div>
      </section>

      {/* Step 3: review, edit, preview */}
      <section className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          3. Review, edit and export
        </h2>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Template:</span>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplate(t.id)}
              title={t.description}
              className={
                template === t.id
                  ? "rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              }
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-4">
              <label className="label">Document title</label>
              <input
                className="field"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={`${cv.fullName || "Client"} CV`}
              />
            </div>
            <CvEditor cv={cv} onChange={setCv} />
          </div>

          <div>
            <div className="lg:sticky lg:top-4">
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={busy === "save"}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {busy === "save" ? "Saving..." : "Save to client"}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={busy === "pdf"}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  {busy === "pdf" ? "Preparing..." : "Download PDF"}
                </button>
              </div>
              <div className="max-h-[80vh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-100 p-4">
                <CVPreview cv={cv} template={template} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

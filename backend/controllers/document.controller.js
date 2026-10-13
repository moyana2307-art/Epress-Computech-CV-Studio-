// Everything to do with saved CVs / cover letters.
//
// A "document" stores the latest approved content. Every time staff save a
// change we ALSO add a row to "document_versions", so nothing is ever lost.
//
// Generated PDFs are stored in the database (pdf_data, a BLOB) rather than on
// disk, so they survive restarts on hosts without a persistent disk.

const { pool } = require('../config/db');

// Turn the base64 string sent by the browser into a Buffer for the BLOB column.
// The browser sometimes sends "data:application/pdf;base64,AAAA...".
function decodePdf(pdfBase64) {
  const clean = String(pdfBase64).replace(/^data:.*?;base64,/, '');
  return Buffer.from(clean, 'base64');
}

// A safe file name to use in the download response.
function pdfFileName(doc) {
  const base = String(doc.title || `document-${doc.id}`).replace(/[^\w.-]+/g, '_');
  return `${base}.pdf`;
}

// Parse the JSON stored in content_json, returning null if empty/broken.
function parseContent(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

// POST /api/documents
async function createDocument(req, res) {
  const {
    client_id,
    document_type = 'cv',
    template = 'modern',
    title,
    content,
    pdfBase64,
  } = req.body;

  if (!client_id) {
    return res.status(400).json({ error: 'A client must be selected.' });
  }

  const contentJson = content ? JSON.stringify(content) : null;
  const pdfData = pdfBase64 ? decodePdf(pdfBase64) : null;

  const [result] = await pool.query(
    `INSERT INTO documents
       (client_id, document_type, template, title, content_json, pdf_data, current_version, created_by)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    [client_id, document_type, template, title || null, contentJson, pdfData, req.staff.id]
  );

  const id = result.insertId;

  // Record version 1 in the history.
  await pool.query(
    `INSERT INTO document_versions
       (document_id, version_number, content_json, pdf_data, created_by)
     VALUES (?, 1, ?, ?, ?)`,
    [id, contentJson, pdfData, req.staff.id]
  );

  const [rows] = await pool.query(
    `SELECT id, client_id, document_type, template, title, content_json,
            (pdf_data IS NOT NULL) AS has_pdf, current_version, created_at, updated_at
     FROM documents WHERE id = ?`,
    [id]
  );
  res.status(201).json({ document: rows[0] });
}

// GET /api/documents?client_id=..&search=..&limit=..
async function listDocuments(req, res) {
  const { client_id, search } = req.query;
  const limit = Math.min(Number(req.query.limit) || 100, 200);

  let sql = `
    SELECT d.id, d.client_id, d.document_type, d.template, d.title,
           d.current_version, (d.pdf_data IS NOT NULL) AS has_pdf,
           d.created_at, d.updated_at,
           c.full_name AS client_name
    FROM documents d
    JOIN clients c ON c.id = d.client_id`;
  const params = [];
  const where = [];

  if (client_id) {
    where.push('d.client_id = ?');
    params.push(Number(client_id));
  }
  if (search && search.trim()) {
    where.push('(d.title LIKE ? OR c.full_name LIKE ?)');
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }
  if (where.length) {
    sql += ' WHERE ' + where.join(' AND ');
  }

  sql += ' ORDER BY d.updated_at DESC LIMIT ?';
  params.push(limit);

  const [rows] = await pool.query(sql, params);

  // Tell the browser whether each document has a downloadable PDF, without
  // ever sending the (large) PDF bytes in a list response.
  const documents = rows.map((row) => ({
    ...row,
    has_pdf: Boolean(row.has_pdf),
  }));

  res.json({ documents });
}

// GET /api/documents/:id - full content + version history.
async function getDocument(req, res) {
  const id = Number(req.params.id);

  const [docRows] = await pool.query(
    `SELECT d.id, d.client_id, d.document_type, d.template, d.title, d.content_json,
            (d.pdf_data IS NOT NULL) AS has_pdf, d.current_version,
            d.created_at, d.updated_at, c.full_name AS client_name
     FROM documents d
     JOIN clients c ON c.id = d.client_id
     WHERE d.id = ?`,
    [id]
  );
  const doc = docRows[0];
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  const [versions] = await pool.query(
    `SELECT id, version_number, (pdf_data IS NOT NULL) AS has_pdf, created_at
     FROM document_versions WHERE document_id = ? ORDER BY version_number DESC`,
    [id]
  );

  res.json({
    document: {
      ...doc,
      content: parseContent(doc.content_json),
      content_json: undefined,
      has_pdf: Boolean(doc.has_pdf),
    },
    versions: versions.map((v) => ({
      ...v,
      has_pdf: Boolean(v.has_pdf),
    })),
  });
}

// PUT /api/documents/:id - save the edited content as a NEW version.
async function saveNewVersion(req, res) {
  const id = Number(req.params.id);
  const { title, template, content, pdfBase64 } = req.body;

  const [rows] = await pool.query(
    `SELECT title, template, content_json, current_version, pdf_data
     FROM documents WHERE id = ?`,
    [id]
  );
  const doc = rows[0];
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  const newVersion = doc.current_version + 1;
  const contentJson = content ? JSON.stringify(content) : doc.content_json;
  const newTitle = title || doc.title;
  const newTemplate = template || doc.template;

  // Reuse the previous PDF when the editor did not send a fresh one.
  const pdfData = pdfBase64 ? decodePdf(pdfBase64) : doc.pdf_data;

  await pool.query(
    `INSERT INTO document_versions
       (document_id, version_number, content_json, pdf_data, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [id, newVersion, contentJson, pdfData, req.staff.id]
  );

  await pool.query(
    `UPDATE documents SET title = ?, template = ?, content_json = ?,
       pdf_data = ?, current_version = ? WHERE id = ?`,
    [newTitle, newTemplate, contentJson, pdfData, newVersion, id]
  );

  const [updated] = await pool.query(
    `SELECT id, client_id, document_type, template, title, content_json,
            (pdf_data IS NOT NULL) AS has_pdf, current_version, created_at, updated_at
     FROM documents WHERE id = ?`,
    [id]
  );
  res.json({ document: updated[0] });
}

// POST /api/documents/:id/pdf  { pdfBase64 }
// Attaches a freshly generated PDF to the document's current version.
async function attachPdf(req, res) {
  const id = Number(req.params.id);
  const { pdfBase64 } = req.body;

  if (!pdfBase64) {
    return res.status(400).json({ error: 'No PDF data was received.' });
  }

  const [rows] = await pool.query(
    'SELECT current_version FROM documents WHERE id = ?',
    [id]
  );
  const doc = rows[0];
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  const pdfData = decodePdf(pdfBase64);
  await pool.query('UPDATE documents SET pdf_data = ? WHERE id = ?', [
    pdfData,
    id,
  ]);
  // Keep the matching version row pointing at the same PDF.
  await pool.query(
    `UPDATE document_versions SET pdf_data = ?
     WHERE document_id = ? AND version_number = ?`,
    [pdfData, id, doc.current_version]
  );

  res.json({ success: true, has_pdf: true });
}

// GET /api/documents/:id/pdf - download the stored PDF (protected route).
async function downloadPdf(req, res) {
  const id = Number(req.params.id);

  const [rows] = await pool.query(
    'SELECT id, title, pdf_data FROM documents WHERE id = ?',
    [id]
  );
  const doc = rows[0];
  if (!doc || !doc.pdf_data || !doc.pdf_data.length) {
    return res.status(404).json({ error: 'No PDF has been saved yet.' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${pdfFileName(doc)}"`
  );
  res.send(doc.pdf_data);
}

// GET /api/dashboard - numbers + recent documents for the dashboard page.
async function dashboard(req, res) {
  const [[clientCount]] = await pool.query(
    'SELECT COUNT(*) AS total FROM clients'
  );
  const [[documentCount]] = await pool.query(
    'SELECT COUNT(*) AS total FROM documents'
  );

  const [recentDocuments] = await pool.query(
    `SELECT d.id, d.title, d.document_type, d.template, d.current_version,
            d.updated_at, (d.pdf_data IS NOT NULL) AS has_pdf,
            c.full_name AS client_name
     FROM documents d
     JOIN clients c ON c.id = d.client_id
     ORDER BY d.updated_at DESC
     LIMIT 5`
  );
  const [recentClients] = await pool.query(
    `SELECT id, full_name, phone, created_at
     FROM clients ORDER BY created_at DESC LIMIT 5`
  );

  res.json({
    totalClients: clientCount.total,
    totalDocuments: documentCount.total,
    recentDocuments: recentDocuments.map((d) => ({
      ...d,
      has_pdf: Boolean(d.has_pdf),
    })),
    recentClients,
  });
}

module.exports = {
  createDocument,
  listDocuments,
  getDocument,
  saveNewVersion,
  attachPdf,
  downloadPdf,
  dashboard,
};

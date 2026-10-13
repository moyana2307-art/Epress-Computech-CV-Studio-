// Everything to do with saved CVs / cover letters.
//
// A "document" stores the latest approved content. Every time staff save a
// change we ALSO add a row to "document_versions", so nothing is ever lost.
// Generated PDF files are stored in backend/storage/documents (private).

const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

// The folder where private PDFs live. __dirname is backend/controllers.
const STORAGE_DIR = path.join(__dirname, '..', 'storage', 'documents');

// Make sure the folder exists (it is git-ignored, so it may be missing).
function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

// Turn a base64 string (sent by the browser) into a saved PDF file.
// Returns the RELATIVE path we store in MySQL, e.g. "documents/file-123.pdf".
function savePdfFile(documentId, version, pdfBase64) {
  ensureStorageDir();

  // The browser sometimes sends "data:application/pdf;base64,AAAA...".
  const clean = String(pdfBase64).replace(/^data:.*?;base64,/, '');
  const buffer = Buffer.from(clean, 'base64');

  const fileName = `document-${documentId}-v${version}-${Date.now()}.pdf`;
  const absolutePath = path.join(STORAGE_DIR, fileName);
  fs.writeFileSync(absolutePath, buffer);

  return `documents/${fileName}`;
}

// Safely turn a stored relative path into an absolute path we can trust.
function resolveStoredFile(relativePath) {
  const absolute = path.resolve(STORAGE_DIR, '..', relativePath);
  const storageRoot = path.resolve(STORAGE_DIR, '..');
  if (!absolute.startsWith(storageRoot)) {
    throw new Error('Invalid file path.');
  }
  return absolute;
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

  const [result] = await pool.query(
    `INSERT INTO documents
       (client_id, document_type, template, title, content_json, current_version, created_by)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [client_id, document_type, template, title || null, contentJson, req.staff.id]
  );

  const id = result.insertId;
  let filePath = null;

  if (pdfBase64) {
    filePath = savePdfFile(id, 1, pdfBase64);
    await pool.query('UPDATE documents SET file_path = ? WHERE id = ?', [
      filePath,
      id,
    ]);
  }

  // Record version 1 in the history.
  await pool.query(
    `INSERT INTO document_versions
       (document_id, version_number, content_json, file_path, created_by)
     VALUES (?, 1, ?, ?, ?)`,
    [id, contentJson, filePath, req.staff.id]
  );

  const [rows] = await pool.query('SELECT * FROM documents WHERE id = ?', [id]);
  res.status(201).json({ document: rows[0] });
}

// GET /api/documents?client_id=..&search=..&limit=..
async function listDocuments(req, res) {
  const { client_id, search } = req.query;
  const limit = Math.min(Number(req.query.limit) || 100, 200);

  let sql = `
    SELECT d.id, d.client_id, d.document_type, d.template, d.title,
           d.current_version, d.file_path, d.created_at, d.updated_at,
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

  // Tell the browser whether each document has a downloadable PDF,
  // without exposing the actual server file path.
  const documents = rows.map((row) => ({
    ...row,
    has_pdf: Boolean(row.file_path),
    file_path: undefined,
  }));

  res.json({ documents });
}

// GET /api/documents/:id - full content + version history.
async function getDocument(req, res) {
  const id = Number(req.params.id);

  const [docRows] = await pool.query(
    `SELECT d.*, c.full_name AS client_name
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
    `SELECT id, version_number, file_path, created_at
     FROM document_versions WHERE document_id = ? ORDER BY version_number DESC`,
    [id]
  );

  res.json({
    document: {
      ...doc,
      content: parseContent(doc.content_json),
      content_json: undefined,
      has_pdf: Boolean(doc.file_path),
      file_path: undefined,
    },
    versions: versions.map((v) => ({
      ...v,
      has_pdf: Boolean(v.file_path),
      file_path: undefined,
    })),
  });
}

// PUT /api/documents/:id - save the edited content as a NEW version.
async function saveNewVersion(req, res) {
  const id = Number(req.params.id);
  const { title, template, content, pdfBase64 } = req.body;

  const [rows] = await pool.query('SELECT * FROM documents WHERE id = ?', [id]);
  const doc = rows[0];
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  const newVersion = doc.current_version + 1;
  const contentJson = content ? JSON.stringify(content) : doc.content_json;
  const newTitle = title || doc.title;
  const newTemplate = template || doc.template;

  let filePath = doc.file_path;
  if (pdfBase64) {
    filePath = savePdfFile(id, newVersion, pdfBase64);
  }

  await pool.query(
    `INSERT INTO document_versions
       (document_id, version_number, content_json, file_path, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [id, newVersion, contentJson, filePath, req.staff.id]
  );

  await pool.query(
    `UPDATE documents SET title = ?, template = ?, content_json = ?,
       file_path = ?, current_version = ? WHERE id = ?`,
    [newTitle, newTemplate, contentJson, filePath, newVersion, id]
  );

  const [updated] = await pool.query('SELECT * FROM documents WHERE id = ?', [
    id,
  ]);
  res.json({ document: updated });
}

// POST /api/documents/:id/pdf  { pdfBase64 }
// Attaches a freshly generated PDF to the document's current version.
async function attachPdf(req, res) {
  const id = Number(req.params.id);
  const { pdfBase64 } = req.body;

  if (!pdfBase64) {
    return res.status(400).json({ error: 'No PDF data was received.' });
  }

  const [rows] = await pool.query('SELECT * FROM documents WHERE id = ?', [id]);
  const doc = rows[0];
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  const filePath = savePdfFile(id, doc.current_version, pdfBase64);
  await pool.query('UPDATE documents SET file_path = ? WHERE id = ?', [
    filePath,
    id,
  ]);
  // Keep the matching version row pointing at the same file.
  await pool.query(
    `UPDATE document_versions SET file_path = ?
     WHERE document_id = ? AND version_number = ?`,
    [filePath, id, doc.current_version]
  );

  res.json({ success: true, has_pdf: true });
}

// GET /api/documents/:id/pdf - download the stored PDF (protected route).
async function downloadPdf(req, res) {
  const id = Number(req.params.id);

  const [rows] = await pool.query(
    'SELECT file_path, title, id FROM documents WHERE id = ?',
    [id]
  );
  const doc = rows[0];
  if (!doc || !doc.file_path) {
    return res.status(404).json({ error: 'No PDF has been saved yet.' });
  }

  const absolutePath = resolveStoredFile(doc.file_path);
  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: 'The PDF file is missing on disk.' });
  }

  res.sendFile(absolutePath);
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
            d.updated_at, d.file_path, c.full_name AS client_name
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
      has_pdf: Boolean(d.file_path),
      file_path: undefined,
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

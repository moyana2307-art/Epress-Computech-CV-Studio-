// Everything to do with clients: create, list (with search), read,
// update and delete. Each client belongs to the staff who created them.

const { pool } = require('../config/db');

// POST /api/clients
async function createClient(req, res) {
  const {
    full_name,
    phone,
    email,
    raw_information,
    target_job_title,
    job_description,
    notes,
  } = req.body;

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: "Please enter the client's name." });
  }

  const [result] = await pool.query(
    `INSERT INTO clients
       (full_name, phone, email, raw_information, target_job_title, job_description, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      full_name.trim(),
      phone || null,
      email || null,
      raw_information || null,
      target_job_title || null,
      job_description || null,
      notes || null,
      req.staff.id,
    ]
  );

  const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [
    result.insertId,
  ]);
  res.status(201).json({ client: rows[0] });
}

// GET /api/clients?search=...
async function listClients(req, res) {
  const search = (req.query.search || '').trim();

  let sql = `
    SELECT c.*,
           (SELECT COUNT(*) FROM documents d WHERE d.client_id = c.id) AS document_count
    FROM clients c`;
  const params = [];

  if (search) {
    sql += ' WHERE c.full_name LIKE ? OR c.phone LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY c.created_at DESC';

  const [rows] = await pool.query(sql, params);
  res.json({ clients: rows });
}

// GET /api/clients/:id - includes the client's saved documents.
async function getClient(req, res) {
  const id = Number(req.params.id);

  const [clientRows] = await pool.query('SELECT * FROM clients WHERE id = ?', [
    id,
  ]);
  if (!clientRows[0]) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  const [documents] = await pool.query(
    `SELECT id, document_type, template, title, current_version, updated_at, file_path
     FROM documents WHERE client_id = ? ORDER BY updated_at DESC`,
    [id]
  );

  res.json({
    client: clientRows[0],
    documents: documents.map((doc) => ({
      ...doc,
      has_pdf: Boolean(doc.file_path),
      file_path: undefined,
    })),
  });
}

// PUT /api/clients/:id
async function updateClient(req, res) {
  const id = Number(req.params.id);
  const {
    full_name,
    phone,
    email,
    raw_information,
    target_job_title,
    job_description,
    notes,
  } = req.body;

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: "Please enter the client's name." });
  }

  const [result] = await pool.query(
    `UPDATE clients SET
       full_name = ?, phone = ?, email = ?, raw_information = ?,
       target_job_title = ?, job_description = ?, notes = ?
     WHERE id = ?`,
    [
      full_name.trim(),
      phone || null,
      email || null,
      raw_information || null,
      target_job_title || null,
      job_description || null,
      notes || null,
      id,
    ]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [id]);
  res.json({ client: rows[0] });
}

// DELETE /api/clients/:id
async function deleteClient(req, res) {
  const id = Number(req.params.id);
  const [result] = await pool.query('DELETE FROM clients WHERE id = ?', [id]);

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Client not found.' });
  }
  res.json({ success: true });
}

module.exports = {
  createClient,
  listClients,
  getClient,
  updateClient,
  deleteClient,
};

// Handles staff accounts: creating the first account, logging in, and
// reading/updating the signed-in user's own profile.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Create a login token that proves who the user is for the next 7 days.
function signToken(staff) {
  return jwt.sign(
    { id: staff.id, email: staff.email, name: staff.name, role: staff.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Remove the password hash before sending a staff row to the browser.
function publicStaff(staff) {
  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
    created_at: staff.created_at,
  };
}

// GET /api/auth/status - used by the login page to know if any account exists.
async function status(req, res) {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM staff');
  res.json({ hasStaff: rows[0].count > 0 });
}

// POST /api/auth/register - creates the FIRST staff account only.
// After that, registration is closed so strangers cannot sign themselves up.
async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Please enter your name.' });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!password || password.length < 8) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 8 characters long.' });
  }

  const [existing] = await pool.query('SELECT COUNT(*) AS count FROM staff');
  if (existing[0].count > 0) {
    return res.status(403).json({
      error:
        'An account already exists. Please sign in instead.',
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    'INSERT INTO staff (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name.trim(), email.trim().toLowerCase(), passwordHash, 'admin']
  );

  const staff = {
    id: result.insertId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: 'admin',
  };
  res.status(201).json({ token: signToken(staff), staff: publicStaff(staff) });
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: 'Please enter your email and password.' });
  }

  const [rows] = await pool.query('SELECT * FROM staff WHERE email = ?', [
    email.trim().toLowerCase(),
  ]);
  const staff = rows[0];

  // Same message whether the email or the password is wrong, so attackers
  // cannot tell which one exists.
  if (!staff) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const ok = await bcrypt.compare(password, staff.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  res.json({ token: signToken(staff), staff: publicStaff(staff) });
}

// GET /api/auth/me - returns the signed-in user (route is protected).
async function me(req, res) {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, created_at FROM staff WHERE id = ?',
    [req.staff.id]
  );
  if (!rows[0]) {
    return res.status(404).json({ error: 'Account not found.' });
  }
  res.json({ staff: rows[0] });
}

// PUT /api/auth/me - update name and/or password.
async function updateMe(req, res) {
  const { name, currentPassword, newPassword } = req.body;

  const [rows] = await pool.query('SELECT * FROM staff WHERE id = ?', [
    req.staff.id,
  ]);
  const staff = rows[0];
  if (!staff) {
    return res.status(404).json({ error: 'Account not found.' });
  }

  const newName = name && name.trim() ? name.trim() : staff.name;

  if (newPassword) {
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: 'New password must be at least 8 characters long.' });
    }
    const ok = await bcrypt.compare(currentPassword || '', staff.password_hash);
    if (!ok) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
  }

  if (newPassword) {
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE staff SET name = ?, password_hash = ? WHERE id = ?', [
      newName,
      hash,
      staff.id,
    ]);
  } else {
    await pool.query('UPDATE staff SET name = ? WHERE id = ?', [
      newName,
      staff.id,
    ]);
  }

  res.json({ staff: { ...publicStaff(staff), name: newName } });
}

module.exports = { status, register, login, me, updateMe };

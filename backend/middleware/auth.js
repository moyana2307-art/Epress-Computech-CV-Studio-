// Checks that a request carries a valid login token.
//
// The frontend sends the token in a header like:
//     Authorization: Bearer <token>
//
// If the token is missing or invalid, we stop the request with a 401 error.
// This is what keeps private client data behind a login.

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Make the logged-in staff member available to later code as req.staff.
    req.staff = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ error: 'Your session has expired. Please sign in again.' });
  }
}

module.exports = { requireAuth };

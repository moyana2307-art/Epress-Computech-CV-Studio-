// Epress CV Studio - backend server
//
// This is the "backend" of the application. It is a small Express server that
// talks to MySQL and (optionally) to an AI provider. The Next.js app is the
// frontend and calls these /api/... routes.
//
// Run it from the project root with:  npm run server
//
// IMPORTANT: real passwords and API keys live in a ".env" file that is NOT
// committed to Git. See ".env.example" for the required variable names.

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/db');

// Login tokens are signed with JWT_SECRET. Refuse to start without it so we
// never run with a blank secret.
if (!process.env.JWT_SECRET) {
  console.error(
    'Missing JWT_SECRET in .env. Copy .env.example to .env and set a long random value.'
  );
  process.exit(1);
}

const authRoutes = require('./routes/auth.routes');
const clientRoutes = require('./routes/client.routes');
const documentRoutes = require('./routes/document.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Allow the Next.js frontend (a different port) to call this API.
app.use(cors());

// Read JSON / form data. The limit is raised so we can receive generated PDFs
// (sent as base64 text) to store them privately on the server.
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Small health-check route so we can confirm the API is alive.
app.get('/', (req, res) => {
  res.json({ message: 'Epress CV Studio API is running' });
});

// A route that also checks the database connection.
app.get('/api/health', async (req, res) => {
  try {
    await testConnection();
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database connection failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Cannot connect to the database. Is MySQL running?',
    });
  }
});

// Feature routes.
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);

// Unknown route.
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Central error handler. Any error thrown inside asyncHandler lands here.
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`Epress CV Studio API running on http://localhost:${PORT}`);
});

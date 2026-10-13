// A small helper the frontend uses to talk to the Express backend.
//
// It looks after the login token (saved in the browser's localStorage) and
// attaches it to every protected request automatically.

// Where the backend lives. Normally this is NEXT_PUBLIC_API_URL. But if the
// app is opened from another device or by its LAN IP (e.g.
// http://192.168.1.5:3000), then `localhost` would point at THAT device, not
// the server, and every request would fail with "Failed to fetch". In that
// case we reuse the page's own hostname on the backend port instead.
const API_URL = (() => {
  const configured = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  if (typeof window === 'undefined') return configured;

  const { hostname, protocol } = window.location;
  const configuredIsLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(
    configured
  );
  if (
    configuredIsLocal &&
    hostname &&
    hostname !== 'localhost' &&
    hostname !== '127.0.0.1'
  ) {
    return `${protocol}//${hostname}:5000`;
  }
  return configured;
})();

const TOKEN_KEY = 'epress_token';
const STAFF_KEY = 'epress_staff';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStaff() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STAFF_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

export function setSession(token, staff) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(STAFF_KEY);
}

// The main function: call the backend and get JSON back.
// Throws an Error (with a friendly message) if something goes wrong.
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  const isJson = (response.headers.get('content-type') || '').includes(
    'application/json'
  );
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(
      (data && data.error) || `Request failed (${response.status})`
    );
    error.code = data && data.code;
    error.status = response.status;
    throw error;
  }

  return data;
}

// Download a saved PDF. Because the file is private, we send the login token
// with the request and turn the reply into a normal browser download.
export async function downloadDocumentPdf(documentId, suggestedName = 'cv') {
  const token = getToken();
  const response = await fetch(`${API_URL}/api/documents/${documentId}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    let message = 'Could not download the PDF.';
    try {
      const data = await response.json();
      message = data.error || message;
    } catch (error) {
      /* keep the default message */
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = `${suggestedName}.pdf`;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

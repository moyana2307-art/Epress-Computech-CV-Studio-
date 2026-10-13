// Handles the AI CV generator.
//
// IMPORTANT: provider API keys live only here on the backend (in .env).
// They are NEVER sent to the browser.
//
// Multiple providers are supported. A provider becomes available as soon as
// its key is present in .env; the frontend asks GET /api/ai/status for the
// list and sends the chosen provider id with POST /api/ai/generate.
//
// If no key is configured, we return a clear "AI_NOT_CONFIGURED" message
// instead of pretending generation works.

// How long (in ms) to wait for a provider before giving up. Override with
// AI_TIMEOUT_MS in .env. Aborting avoids hanging the request on a slow or
// stuck provider.
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 60000;

// Each definition maps a provider to its .env variable names. Only providers
// whose key is set are exposed. The default base URL / model are used when the
// matching *_BASE_URL / *_MODEL variables are not set.
const PROVIDER_DEFINITIONS = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    envKey: 'GEMINI_API_KEY',
    envBaseUrl: 'GEMINI_API_BASE_URL',
    envModel: 'GEMINI_MODEL',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-3.6-flash',
  },
  {
    id: 'claude',
    label: 'Anthropic Claude',
    envKey: 'CLAUDE_API_KEY',
    envBaseUrl: 'CLAUDE_API_BASE_URL',
    envModel: 'CLAUDE_MODEL',
    envWorkspaceId: 'CLAUDE_WORKSPACE_ID',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-6',
  },
];

// Turn one definition into a ready-to-use config, or null when its key is
// missing.
function resolveProvider(definition) {
  const apiKey = process.env[definition.envKey];
  if (!apiKey) return null;

  // Some providers (e.g. multi-workspace Anthropic keys) need an extra header.
  const headers = {};
  if (definition.envWorkspaceId && process.env[definition.envWorkspaceId]) {
    headers['anthropic-workspace-id'] =
      process.env[definition.envWorkspaceId];
  }

  return {
    id: definition.id,
    label: definition.label,
    apiKey,
    headers,
    baseUrl: (process.env[definition.envBaseUrl] || definition.defaultBaseUrl)
      .replace(/\/$/, ''),
    model: process.env[definition.envModel] || definition.defaultModel,
  };
}

// The legacy single-provider config (AI_API_KEY). Kept so older setups keep
// working without changes. It appears as the "default" provider and is handy
// for any other OpenAI-compatible service (OpenAI, Groq, OpenRouter, Ollama).
function resolveDefaultProvider() {
  if (!process.env.AI_API_KEY) return null;
  return {
    id: 'default',
    label: process.env.AI_LABEL || 'Default provider',
    apiKey: process.env.AI_API_KEY,
    baseUrl: (process.env.AI_API_BASE_URL || 'https://api.openai.com/v1').replace(
      /\/$/,
      ''
    ),
    model: process.env.AI_MODEL || 'gpt-4o-mini',
  };
}

// Every provider that currently has a key, in display order.
function listProviders() {
  const providers = [];
  for (const definition of PROVIDER_DEFINITIONS) {
    const resolved = resolveProvider(definition);
    if (resolved) providers.push(resolved);
  }
  const fallback = resolveDefaultProvider();
  if (fallback) providers.push(fallback);
  return providers;
}

// Find a provider by id. With no id, honour AI_PROVIDER from .env, else use
// the first available provider.
function findProvider(id) {
  const providers = listProviders();
  if (id) return providers.find((provider) => provider.id === id) || null;
  const preferred = process.env.AI_PROVIDER;
  return (
    providers.find((provider) => provider.id === preferred) ||
    providers[0] ||
    null
  );
}

// Public description of a provider. Never includes the API key.
function publicView(provider) {
  return {
    id: provider.id,
    label: provider.label,
    model: provider.model,
    baseUrl: provider.baseUrl,
  };
}

// GET /api/ai/status - lets the frontend show available providers.
async function status(req, res) {
  const providers = listProviders().map(publicView);
  const preferred = findProvider(null);

  res.json({
    configured: providers.length > 0,
    providers,
    defaultProvider: preferred ? preferred.id : null,
    // Backwards-compatible top-level fields for older callers.
    model: preferred ? preferred.model : null,
    baseUrl: preferred ? preferred.baseUrl : null,
  });
}

// The instructions we give the AI. These rules are the heart of the feature.
function buildSystemPrompt() {
  return [
    'You are an expert CV writer for a professional business services company.',
    'You take messy notes a client gave us and organise them into a clean CV.',
    '',
    'STRICT RULES:',
    '- NEVER invent employment history, employers, dates, qualifications,',
    '  certificates, skills, references or achievements that are not present',
    '  in the information provided.',
    '- You MAY fix spelling and grammar and improve wording to sound professional.',
    '- You MAY write a short summary based ONLY on the real background given.',
    '- When a target job title or job description is provided, highlight the',
    '  relevant skills, but still never invent any.',
    '- If important information is missing or two facts contradict each other,',
    '  list that under "warnings" instead of guessing.',
    '',
    'Return ONLY valid JSON (no markdown, no extra text) in exactly this shape:',
    '{',
    '  "fullName": "", "email": "", "phone": "", "location": "",',
    '  "targetJobTitle": "",',
    '  "summary": "",',
    '  "skills": [""],',
    '  "experience": [ { "title": "", "company": "", "location": "",',
    '                    "startDate": "", "endDate": "", "bullets": [""] } ],',
    '  "education": [ { "qualification": "", "institution": "", "location": "",',
    '                   "startDate": "", "endDate": "", "details": "" } ],',
    '  "qualifications": [""],',
    '  "certificates": [""],',
    '  "projects": [ { "name": "", "description": "" } ],',
    '  "references": [ { "name": "", "contact": "" } ],',
    '  "warnings": [""]',
    '}',
    'Use empty strings/arrays when information is not available.',
  ].join('\n');
}

// Pull the JSON object out of the AI's reply, even if it added stray text.
function extractJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch (inner) {
        return null;
      }
    }
    return null;
  }
}

// POST /api/ai/generate
async function generate(req, res) {
  const {
    rawInformation,
    targetJobTitle,
    jobDescription,
    clientName,
    provider: requestedProvider,
  } = req.body || {};

  // Clearly tell the frontend that no provider is set up yet.
  if (listProviders().length === 0) {
    return res.status(503).json({
      code: 'AI_NOT_CONFIGURED',
      error:
        'AI is not configured yet. Add a provider key (GEMINI_API_KEY, ' +
        'CLAUDE_API_KEY, or AI_API_KEY) to the backend .env file, then ' +
        'restart the server. You can still write the CV manually.',
    });
  }

  // Pick the requested provider, or fall back to the configured default.
  const provider = findProvider(requestedProvider);

  if (!provider) {
    return res.status(400).json({
      code: 'AI_PROVIDER_UNKNOWN',
      error:
        `The selected AI provider ("${requestedProvider}") is not configured. ` +
        'Check the backend .env file and try again.',
    });
  }

  if (!rawInformation || !rawInformation.trim()) {
    return res.status(400).json({
      error: "Please paste the client's information before generating.",
    });
  }

  const userPrompt = [
    clientName ? `Client name (if known): ${clientName}` : '',
    targetJobTitle ? `Target job title: ${targetJobTitle}` : '',
    jobDescription ? `Job description to tailor towards:\n${jobDescription}` : '',
    'Information collected from the client:',
    rawInformation,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    // Never let a slow/hung provider block the request forever.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey}`,
          ...provider.headers,
        },
        body: JSON.stringify({
          model: provider.model,
          temperature: 0.2,
          messages: [
            { role: 'system', content: buildSystemPrompt() },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const details = await response.text();
      console.error(
        `AI provider error (${provider.id}):`,
        response.status,
        details
      );
      return res.status(502).json({
        error:
          `The AI provider "${provider.label}" returned an error. Please ` +
          'check its API key and account credit, then try again.',
      });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    const cv = extractJson(text);

    if (!cv) {
      return res.status(502).json({
        error: 'The AI reply was not in the expected format. Please try again.',
      });
    }

    res.json({ cv, provider: provider.id, model: provider.model });
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`AI provider timed out (${provider.id}).`);
      return res.status(504).json({
        error:
          `The AI provider "${provider.label}" took too long to respond. ` +
          'Please try again in a moment.',
      });
    }
    console.error('AI request failed:', error.message);
    res.status(502).json({
      error: 'Could not reach the AI provider. Check your internet connection.',
    });
  }
}

module.exports = { status, generate };

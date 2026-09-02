/**
 * Fetch wrapper for the ASP.NET Core API.
 *
 * Token policy: the short-lived access token is kept in memory only, so an XSS payload cannot
 * lift a long-lived credential out of storage. The rotating refresh token is persisted — that is
 * what lets a page reload restore the session.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
const REFRESH_TOKEN_KEY = 'resumon.refreshToken';

const OFFLINE_MESSAGE = 'Could not reach the server. Check your connection and try again.';

const STATUS_MESSAGES = {
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have access to that.',
  404: 'Not found.',
  413: 'That file is too large.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on the server. Please try again.',
  503: 'The server is temporarily unavailable. Please try again.',
};

let accessToken = null;
let refreshToken = readStoredRefreshToken();
let sessionExpiredHandler = null;

// One shared refresh promise. A burst of parallel 401s must not spend the same rotating token
// twice: the API treats a replayed refresh token as theft and revokes the whole family.
let refreshInFlight = null;

/** An API call that came back non-2xx, or could not be made at all. */
export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    /** Field name → message, for forms. `general` holds errors not tied to one field. */
    this.fieldErrors = fieldErrors;
  }
}

// ── Token store ───────────────────────────────────────────────────────────────

function readStoredRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    // Storage blocked (private mode, embedded webview): the session lives in this tab only.
    return null;
  }
}
function writeStoredRefreshToken(value) {
  try {
    if (value) localStorage.setItem(REFRESH_TOKEN_KEY, value);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Same as above — nothing to persist to, and nothing worth failing a sign-in over.
  }
}

/** Stores a fresh pair from register/login/refresh. Pass nothing to sign out. */
export function setTokens(tokens) {
  accessToken = tokens?.accessToken ?? null;
  refreshToken = tokens?.refreshToken ?? null;
  writeStoredRefreshToken(refreshToken);
}

export function clearTokens() {
  setTokens(null);
}

/** True when a reload has a refresh token to rehydrate the session from. */
export function hasStoredSession() {
  return Boolean(refreshToken);
}

/** Registers the callback that drops the user from React state once a session is gone. */
export function onSessionExpired(handler) {
  sessionExpiredHandler = handler;
}

// ── Requests ──────────────────────────────────────────────────────────────────

/**
 * Calls the API and returns the parsed body, throwing {@link ApiError} on failure. A 401 on an
 * authenticated call triggers one refresh-and-replay before it is reported.
 */
export async function apiFetch(path, { auth = true, retryOn401 = true, json, ...init } = {}) {
  const response = await send(path, init, json, auth);

  if (response.status !== 401 || !auth || !retryOn401) {
    return parse(response);
  }

  const refreshed = await refreshSession();

  if (!refreshed) {
    sessionExpiredHandler?.();

    return parse(response); // Re-reports the original 401 as an ApiError.
  }

  return parse(await send(path, init, json, auth));
}
async function send(path, init, json, auth) {
  const headers = new Headers(init.headers ?? {});
  let body = init.body;

  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  // FormData is left alone on purpose: fetch has to set its own multipart boundary.
  if (auth && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  try {
    return await fetch(`${API_BASE_URL}${path}`, { ...init, headers, body });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;

    throw new ApiError(OFFLINE_MESSAGE);
  }
}

async function parse(response) {
  const payload = await readBody(response);

  if (response.ok) return payload;

  const fieldErrors = toFieldErrors(payload);

  throw new ApiError(messageFor(response.status, payload, fieldErrors), {
    status: response.status,
    fieldErrors,
  });
}

async function readBody(response) {
  if (response.status === 204 || response.status === 205) return null;

  if (!(response.headers.get('content-type') ?? '').includes('json')) {
    const text = await response.text().catch(() => '');

    return text ? { detail: text } : null;
  }

  return response.json().catch(() => null);
}
/**
 * Flattens an ASP.NET `ValidationProblemDetails.errors` bag into one message per field, so a form
 * can put the text next to the input that caused it. The unnamed `""` key becomes `general`.
 */
function toFieldErrors(payload) {
  if (!payload?.errors || typeof payload.errors !== 'object') return null;

  const mapped = {};

  for (const [key, messages] of Object.entries(payload.errors)) {
    const message = (Array.isArray(messages) ? messages.filter(Boolean).join(' ') : `${messages}`).trim();

    if (!message) continue;

    mapped[key ? key[0].toLowerCase() + key.slice(1) : 'general'] = message;
  }

  return Object.keys(mapped).length > 0 ? mapped : null;
}

function messageFor(status, payload, fieldErrors) {
  return (
    payload?.error ?? // ErrorResponse — the API's own wording, always preferred.
    fieldErrors?.general ??
    Object.values(fieldErrors ?? {})[0] ??
    payload?.detail ??
    payload?.title ??
    STATUS_MESSAGES[status] ??
    `Request failed (${status}).`
  );
}

// ── Refresh ───────────────────────────────────────────────────────────────────

/**
 * Rotates the stored refresh token. Resolves to the auth payload, or null when there is no token
 * or the server rejected it. Rejects only when the API could not be reached, so a temporary
 * outage does not throw away a still-valid token.
 */
export function refreshSession() {
  if (!refreshToken) return Promise.resolve(null);

  refreshInFlight ??= rotate(refreshToken).finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}
async function rotate(token) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token }),
    });
  } catch {
    throw new ApiError(OFFLINE_MESSAGE);
  }

  if (!response.ok) {
    clearTokens(); // Rejected outright: the token is dead, stop replaying it.

    return null;
  }

  const auth = await response.json();
  setTokens(auth.tokens);

  return auth;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

function post(path, json, options) {
  return apiFetch(path, { method: 'POST', json, ...options });
}

export const api = {
  register: (payload) => post('/api/auth/register', payload, { auth: false }),
  login: (payload) => post('/api/auth/login', payload, { auth: false }),
  me: () => apiFetch('/api/auth/me'),

  /** Retires the stored refresh token server-side. Anonymous, so an expired access token is fine. */
  logout: () => post('/api/auth/logout', { refreshToken }, { auth: false, retryOn401: false }),

  analyze: (file) => {
    const form = new FormData();
    form.append('file', file);

    return apiFetch('/api/analyze', { method: 'POST', body: form });
  },

  history: (limit = 30) => apiFetch(`/api/history?limit=${limit}`),
  stats: () => apiFetch('/api/stats'),
  latestScan: () => apiFetch('/api/scans/latest'),
};

/**
 * Raven API Client
 *
 * Connects the React frontend to the FastAPI backend.
 * In development, Vite proxies /api to localhost:8000.
 * In production, Caddy proxies /api to the api container.
 */

const BASE = '/api';

function getToken() {
  return localStorage.getItem('raven_token');
}

function setToken(token) {
  if (token) localStorage.setItem('raven_token', token);
  else localStorage.removeItem('raven_token');
}

function authHeaders() {
  const t = getToken();
  return t ? { 'Authorization': `Bearer ${t}` } : {};
}

async function request(path, params = {}) {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, v);
    }
  });

  const resp = await fetch(url.toString());
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `API error: ${resp.status}`);
  }
  return resp.json();
}

async function authPost(path, body = {}) {
  const resp = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.detail || `API error: ${resp.status}`);
  return data;
}

async function authGet(path) {
  const resp = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.detail || `API error: ${resp.status}`);
  return data;
}

async function authDelete(path) {
  const resp = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: authHeaders() });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.detail || `API error: ${resp.status}`);
  return data;
}

// ── Endpoints ──────────────────────────────────────────────────

export const api = {
  /** Health check */
  health: () => request('/health'),

  /** Dashboard summary stats */
  stats: (days = 30, market) => request('/stats', { days, market }),

  /** Paginated deals with filters */
  deals: ({
    page = 1, perPage = 50, ticker, director,
    transactionType, sector, minValue, maxValue,
    days, sort, order, search, market, excludeNonDiscretionary,
  } = {}) =>
    request('/deals', {
      page, per_page: perPage, ticker, director,
      transaction_type: transactionType, sector,
      min_value: minValue, max_value: maxValue,
      days, sort, order, search, market,
      exclude_non_discretionary: excludeNonDiscretionary,
    }),

  /** Most recent deals */
  latest: (limit = 20) => request('/deals/latest', { limit }),

  /** Deals for a specific company */
  companyDeals: (ticker, limit = 50) =>
    request(`/deals/company/${ticker}`, { limit }),

  /** Deals by a specific director */
  directorDeals: (name, limit = 50) =>
    request(`/deals/director/${encodeURIComponent(name)}`, { limit }),

  /** Cluster buy detection */
  clusters: (days = 30, minInsiders = 2, market) =>
    request('/deals/clusters', { days, min_insiders: minInsiders, market }),

  /** Sector flow aggregation */
  sectors: (days = 30, market) => request('/deals/sectors', { days, market }),

  /** Company registry */
  companies: (sector, days, market) => request('/companies', { sector, days, market }),

  /** Seed mock data (development only) */
  seed: () =>
    fetch(`${BASE}/dev/seed`, { method: 'POST' }).then(r => r.json()),

  // ── Auth ──────────────────────────────────────────────────────
  signup: (email, password) => authPost('/auth/signup', { email, password }).then(d => { setToken(d.token); return d; }),
  login: (email, password) => authPost('/auth/login', { email, password }).then(d => { setToken(d.token); return d; }),
  me: () => authGet('/auth/me'),
  logout: () => { setToken(null); },
  getToken,

  // ── Watchlist ─────────────────────────────────────────────────
  watchlist: () => authGet('/watchlist'),
  addWatch: (ticker) => authPost('/watchlist', { ticker }),
  removeWatch: (ticker) => authDelete(`/watchlist/${encodeURIComponent(ticker)}`),
  watchlistDigest: (days = 30) => authGet(`/watchlist/digest?days=${days}`),

  // ── Stripe ────────────────────────────────────────────────────
  createCheckout: () => authPost('/stripe/create-checkout'),
  createPortal: () => authPost('/stripe/portal'),
};

export default api;

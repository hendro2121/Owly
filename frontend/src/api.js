/**
 * Raven API Client
 *
 * Connects the React frontend to the FastAPI backend.
 * In development, Vite proxies /api to localhost:8000.
 * In production, Caddy proxies /api to the api container.
 */

const BASE = '/api';

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
    days, sort, order, search, market,
  } = {}) =>
    request('/deals', {
      page, per_page: perPage, ticker, director,
      transaction_type: transactionType, sector,
      min_value: minValue, max_value: maxValue,
      days, sort, order, search, market,
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
};

export default api;

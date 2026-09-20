/** Shared by Axios and direct fetch callers for same-origin or split hosting. */
export function apiUrl(path: string, baseUrl = import.meta.env?.VITE_API_BASE_URL || '/api'): string {
  const base = baseUrl.replace(/\/+$/, '');
  return path ? `${base}/${path.replace(/^\/+/, '')}` : base;
}

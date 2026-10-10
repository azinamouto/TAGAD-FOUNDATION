/** One validated API root for authentication, application requests and exports. */
export function apiUrl(path: string, baseUrl = import.meta.env?.VITE_API_BASE_URL || '/api'): string {
  const base = baseUrl.trim().replace(/\/+$/, '');
  if (!base || base.startsWith('//') || /[?#\\]/.test(base)) throw new Error('Invalid VITE_API_BASE_URL');
  if (!base.startsWith('/')) {
    const url = new URL(base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid VITE_API_BASE_URL');
  }
  return path ? `${base}/${path.replace(/^\/+/, '')}` : base;
}

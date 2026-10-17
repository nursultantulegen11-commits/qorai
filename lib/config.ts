export function appOrigin(): URL {
  const value = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || (process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:3000' : '');
  if (!value) throw new Error('APP_URL is required');
  const url = new URL(value);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:'))) throw new Error('APP_URL must use HTTPS');
  return new URL(url.origin);
}

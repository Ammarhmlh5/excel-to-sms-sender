function isAllowedOrigin(origin: string): boolean {
  if (origin === 'http://localhost:5173' || origin === 'http://localhost:3000' || origin === 'http://localhost:8080') return true;
  if (origin === 'http://127.0.0.1:5173' || origin === 'http://127.0.0.1:3000' || origin === 'http://127.0.0.1:8080') return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.netlify\.app$/.test(origin)) return true;
  if (/^https:\/\/excel[-a-z0-9]*\.vercel\.app$/.test(origin)) return true;
  if (/^https:\/\/excel[-a-z0-9]*\.netlify\.app$/.test(origin)) return true;
  const envOrigin = Deno.env.get('CORS_ORIGIN');
  if (envOrigin && origin === envOrigin) return true;
  return false;
}

export function getCorsHeaders(requestOrigin?: string): Record<string, string> {
  const origin = requestOrigin || 'http://localhost:5173';
  if (!isAllowedOrigin(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  };
}

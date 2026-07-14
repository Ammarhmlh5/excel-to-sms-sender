// Simplified CORS helper: in development allow common localhost origins and
// return the appropriate Access-Control headers for preflight and actual requests.
export function getCorsHeaders(requestOrigin?: string): Record<string, string> {
  const origin = requestOrigin || Deno.env.get('CORS_ORIGIN') || '*';

  // Always return CORS headers. In production you can set CORS_ORIGIN env var
  // to restrict allowed origins. When origin is '*', do not set credentials to true.
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  };

  if (origin === '*') {
    headers['Access-Control-Allow-Origin'] = '*';
    headers['Access-Control-Allow-Credentials'] = 'false';
  } else {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

export interface HudhudMessage {
  to: string;
  message: string;
}

export interface HudhudResult {
  response: Response;
  body: Record<string, unknown>;
}

export async function sendToHudhud(opts: { apiKey: string; messages: HudhudMessage[] }): Promise<HudhudResult> {
  const { apiKey, messages } = opts;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch('https://www.hloov.com/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ api_key: apiKey, messages }),
      signal: controller.signal,
    });

    let body: Record<string, unknown> = {};
    try {
      body = await res.json();
    } catch {
      body = { error: 'invalid_json', message: 'Provider returned non-JSON response' };
    }

    return { response: res, body };
  } finally {
    clearTimeout(timeout);
  }
}

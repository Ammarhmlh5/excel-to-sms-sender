export interface HudhudMessage {
  to: string;
  message: string;
  sender_id?: string;
}

export interface HudhudResult {
  response: Response;
  body: Record<string, unknown>;
}

export async function sendToHudhud(opts: { apiKey: string; messages: HudhudMessage[]; senderId?: string; baseUrl?: string }): Promise<HudhudResult> {
  const { apiKey, messages, senderId, baseUrl } = opts;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const endpoint = baseUrl || Deno.env.get('HUDHUD_BASE_URL') || 'https://www.hloov.com/api/sms/send';
    const payload: Record<string, unknown> = { api_key: apiKey, messages };
    if (senderId) {
      payload.sender_id = senderId;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
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

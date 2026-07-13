import type { ProviderAdapter, ProviderMessage, ProviderResult } from './index.ts';

const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';

const adapter: ProviderAdapter = {
  async send(messages: ProviderMessage[]): Promise<ProviderResult> {
    // This adapter expects server key in env FCM_SERVER_KEY
    const serverKey = Deno.env.get('FCM_SERVER_KEY') || '';
    if (!serverKey) return { ok: false, raw: { error: 'no_fcm_key' } };

    // Build minimal batch payload per message (this will need to be adapted to real payload)
    const results = [];
    for (const m of messages) {
      try {
        const res = await fetch(FCM_ENDPOINT, {
          method: 'POST',
          headers: { 'Authorization': `key=${serverKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: m.to, notification: { body: m.message } }),
        });
        const body = await res.json().catch(() => ({}));
        results.push({ ok: res.ok, body });
      } catch (e) {
        results.push({ ok: false, body: { error: String(e) } });
      }
    }

    return { ok: results.every(r => r.ok), raw: { results } };
  }
};

export default adapter;

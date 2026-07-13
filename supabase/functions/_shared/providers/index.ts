export type ProviderMessage = { to: string; message: string };

export interface ProviderResult {
  ok: boolean;
  raw: Record<string, unknown>;
}

export interface ProviderAdapter {
  send(messages: ProviderMessage[], meta?: Record<string, unknown>): Promise<ProviderResult>;
}

import { sendToHudhud } from './hudhud.ts';

// Lazy adapters map
export function getAdapter(name: string): ProviderAdapter {
  if (name === 'hudhud') {
    return {
      async send(messages: ProviderMessage[]) {
        const res = await sendToHudhud({ apiKey: Deno.env.get('HUDHUD_API_KEY') || '', messages });
        return { ok: res.response.ok, raw: res.body || {} };
      }
    };
  }

  if (name === 'fcm') {
    // fcm adapter will be implemented in fcm.ts
    try {
      const mod = await import('./fcm.ts');
      return mod.default;
    } catch {
      return {
        async send() { return { ok: false, raw: { error: 'fcm_not_implemented' } }; }
      };
    }
  }

  if (name === 'apns') {
    try {
      const mod = await import('./apns.ts');
      return mod.default;
    } catch {
      return {
        async send() { return { ok: false, raw: { error: 'apns_not_implemented' } }; }
      };
    }
  }

  return {
    async send() { return { ok: false, raw: { error: 'unknown_provider' } }; }
  };
}

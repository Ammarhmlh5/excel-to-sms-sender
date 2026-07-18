export type ProviderMessage = { to: string; message: string };

export interface ProviderResult {
  ok: boolean;
  raw: Record<string, unknown>;
}

export interface ProviderAdapter {
  send(messages: ProviderMessage[], meta?: Record<string, unknown>): Promise<ProviderResult>;
}

import { sendToHudhud } from './hudhud.ts';
import { getHudhudConfigFromEnv } from '../config/hudhud.ts';

// Lazy adapters map
export function getAdapter(name: string): ProviderAdapter {
  if (name === 'hudhud') {
    return {
      async send(messages: ProviderMessage[], meta?: Record<string, unknown>) {
        const hudhudConfig = await getHudhudConfigFromEnv();
        const apiKey = (typeof meta?.api_key === 'string' && meta.api_key.trim())
          ? String(meta.api_key).trim()
          : hudhudConfig.apiKey;
        if (!apiKey) {
          return {
            ok: false,
            raw: {
              error: 'missing_provider_api_key',
              message: 'مفتاح API الخاص بمنصة الهدهد غير موجود. الرجاء إضافته من الإعدادات.',
            },
          };
        }

        const senderId = typeof meta?.sender_id === 'string' ? meta.sender_id : hudhudConfig.senderId || '';
        const baseUrl = typeof meta?.base_url === 'string' ? meta.base_url : hudhudConfig.baseUrl || '';
        const res = await sendToHudhud({
          apiKey,
          messages: messages.map(message => ({
            to: message.to,
            message: message.message,
            ...(senderId ? { sender_id: senderId } : {}),
          })),
          ...(senderId ? { senderId } : {}),
          ...(baseUrl ? { baseUrl } : {}),
        });
        return {
          ok: res.response.ok,
          raw: {
            ...(res.body || {}),
            _http_status: res.response.status,
          },
        };
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

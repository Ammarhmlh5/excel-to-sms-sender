import type { ProviderAdapter, ProviderMessage, ProviderResult } from './index.ts';

// APNs adapter placeholder — implementing APNs requires signing JWT and HTTP/2.
const adapter: ProviderAdapter = {
  async send(messages: ProviderMessage[]): Promise<ProviderResult> {
    return { ok: false, raw: { error: 'apns_not_implemented' } };
  }
};

export default adapter;

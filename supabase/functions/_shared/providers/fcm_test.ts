import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import adapter from './fcm.ts';

Deno.test('fcm adapter - no key returns error', async () => {
  const originalEnv = Deno.env.get('FCM_SERVER_KEY');
  try {
    Deno.env.delete('FCM_SERVER_KEY');
    const res = await adapter.send([{ to: 'token', message: 'hi' }]);
    assertEquals(res.ok, false);
    assert(res.raw && (res.raw as any).error === 'no_fcm_key');
  } finally {
    if (originalEnv) Deno.env.set('FCM_SERVER_KEY', originalEnv);
  }
});

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { sendToHudhud } from "./hudhud.ts";

Deno.test("hudhud adapter sends payload shape and returns response object", async () => {
  // This test assumes HUDHUD_API_KEY is set in env for integration testing.
  // It will skip when the key is not provided so CI can opt-in to run integration tests.
  const apiKey = Deno.env.get('HUDHUD_API_KEY');
  if (!apiKey) {
    console.warn('Skipping hudhud_integration_test: HUDHUD_API_KEY not set');
    return;
  }

  const messages = [{ to: '+11234567890', message: 'اختبار' }];
  const res = await sendToHudhud({ apiKey, messages });

  // Adapter should return an object with response and body
  assertEquals(typeof res, 'object');
  if (res.body) {
    // body may contain success indicator depending on provider
    // ensure it's JSON parseable
    assertEquals(typeof res.body, 'object');
  }
});

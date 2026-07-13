import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { sendToHudhud } from "./hudhud.ts";

Deno.test("sendToHudhud - parses JSON success response", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }) as any;
    const res = await sendToHudhud({ apiKey: 'test', messages: [{ to: '+123', message: 'hello' }] });
    assert(res.response.ok);
    assertEquals(res.body.success, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("sendToHudhud - handles non-JSON response", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('not json', { status: 200, headers: { 'Content-Type': 'text/plain' } }) as any;
    const res = await sendToHudhud({ apiKey: 'test', messages: [{ to: '+123', message: 'hello' }] });
    assert(res.response.ok);
    // When provider returns non-JSON, adapter returns an object with error key
    assert(res.body && (res.body as any).error === 'invalid_json');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("sendToHudhud - aborts propagate", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new DOMException('Aborted', 'AbortError'); } as any;
    let threw = false;
    try {
      await sendToHudhud({ apiKey: 'test', messages: [{ to: '+123', message: 'hello' }] });
    } catch (e) {
      threw = true;
      assert(e instanceof DOMException);
      assertEquals((e as DOMException).name, 'AbortError');
    }
    assert(threw);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

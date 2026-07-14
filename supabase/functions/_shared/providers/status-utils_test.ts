import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { normalizeCampaignMessageStatus, normalizeDeliveryAttemptStatus } from "./status-utils.ts";

Deno.test("normalizeDeliveryAttemptStatus maps delivered to sent", () => {
  assertEquals(normalizeDeliveryAttemptStatus('delivered'), 'sent');
});

Deno.test("normalizeDeliveryAttemptStatus maps rejected to failed", () => {
  assertEquals(normalizeDeliveryAttemptStatus('rejected'), 'failed');
});

Deno.test("normalizeCampaignMessageStatus maps delivered to sent", () => {
  assertEquals(normalizeCampaignMessageStatus('delivered'), 'sent');
});

Deno.test("normalizeCampaignMessageStatus maps pending to pending", () => {
  assertEquals(normalizeCampaignMessageStatus('pending'), 'pending');
});

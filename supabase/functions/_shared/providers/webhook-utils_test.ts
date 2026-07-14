import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { extractCampaignMessageId } from "./webhook-utils.ts";
import { extractProviderReference } from "./reference-utils.js";

Deno.test("extractProviderReference returns top-level requestId when present", () => {
  const payload = { requestId: 'abc123' };
  assertEquals(extractProviderReference(payload), 'abc123');
});

Deno.test("extractProviderReference returns nested provider_ref from data", () => {
  const payload = { data: { provider_ref: 'ref-456' } };
  assertEquals(extractProviderReference(payload), 'ref-456');
});

Deno.test("extractCampaignMessageId finds campaign_message_id at root", () => {
  const payload = { campaign_message_id: 'msg-123' };
  assertEquals(extractCampaignMessageId(payload, null), 'msg-123');
});

Deno.test("extractCampaignMessageId finds campaignMessageId in event", () => {
  const payload = {};
  const event = { campaignMessageId: 'msg-456' };
  assertEquals(extractCampaignMessageId(payload, event), 'msg-456');
});

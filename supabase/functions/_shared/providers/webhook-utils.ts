export function extractCampaignMessageId(payload: Record<string, unknown> | null | undefined, event: Record<string, unknown> | null | undefined): string | null {
  const getNestedValue = (obj: Record<string, unknown> | null | undefined, key: string): unknown => {
    if (!obj || typeof obj !== 'object') return undefined;
    const value = (obj as Record<string, unknown>)[key];
    return value;
  };

  const payloadData = payload && typeof payload === 'object' ? payload as Record<string, unknown> : undefined;
  const eventData = event && typeof event === 'object' ? event as Record<string, unknown> : undefined;
  const payloadDataObj = payloadData?.data && typeof payloadData.data === 'object' ? payloadData.data as Record<string, unknown> : undefined;
  const eventDataObj = eventData?.data && typeof eventData.data === 'object' ? eventData.data as Record<string, unknown> : undefined;
  const payloadResultObj = payloadData?.result && typeof payloadData.result === 'object' ? payloadData.result as Record<string, unknown> : undefined;
  const eventResultObj = eventData?.result && typeof eventData.result === 'object' ? eventData.result as Record<string, unknown> : undefined;

  const candidates = [
    getNestedValue(payloadData, 'campaign_message_id'),
    getNestedValue(payloadData, 'campaignMessageId'),
    getNestedValue(eventData, 'campaign_message_id'),
    getNestedValue(eventData, 'campaignMessageId'),
    getNestedValue(eventData, 'message_id'),
    getNestedValue(eventData, 'messageId'),
    getNestedValue(payloadDataObj, 'campaign_message_id'),
    getNestedValue(payloadDataObj, 'campaignMessageId'),
    getNestedValue(eventDataObj, 'campaign_message_id'),
    getNestedValue(eventDataObj, 'campaignMessageId'),
    getNestedValue(payloadResultObj, 'campaign_message_id'),
    getNestedValue(payloadResultObj, 'campaignMessageId'),
    getNestedValue(eventResultObj, 'campaign_message_id'),
    getNestedValue(eventResultObj, 'campaignMessageId'),
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

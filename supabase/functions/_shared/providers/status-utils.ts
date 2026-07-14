export function normalizeDeliveryAttemptStatus(status: unknown): string {
  const value = String(status ?? 'unknown').trim().toLowerCase();

  if (['delivered', 'sent', 'success', 'successful'].includes(value)) {
    return 'sent';
  }

  if (['failed', 'rejected', 'error', 'cancelled', 'canceled'].includes(value)) {
    return 'failed';
  }

  if (['expired'].includes(value)) {
    return 'expired';
  }

  if (['queued', 'pending', 'waiting', 'submitted', 'initiated', 'processing'].includes(value)) {
    return 'queued';
  }

  if (['sending', 'in_progress', 'inprogress', 'dispatching'].includes(value)) {
    return 'sending';
  }

  return 'sending';
}

export function normalizeCampaignMessageStatus(status: unknown): string {
  const value = String(status ?? 'unknown').trim().toLowerCase();

  if (['delivered', 'sent', 'success', 'successful'].includes(value)) {
    return 'sent';
  }

  if (['failed', 'rejected', 'error', 'cancelled', 'canceled'].includes(value)) {
    return 'failed';
  }

  return 'pending';
}

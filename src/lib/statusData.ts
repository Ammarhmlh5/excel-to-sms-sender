type BadgeVariant = 'default' | 'destructive' | 'secondary' | 'outline';

export type { BadgeVariant };

export const CAMPAIGN_STATUSES: Record<string, { label: string; variant: BadgeVariant; color: string }> = {
  completed: { label: 'مكتملة', variant: 'default', color: 'text-primary' },
  partially_completed: { label: 'مكتملة جزئياً', variant: 'default', color: 'text-accent' },
  sending: { label: 'جاري الإرسال', variant: 'secondary', color: 'text-accent' },
  queued: { label: 'في الانتظار', variant: 'outline', color: 'text-muted-foreground' },
  failed: { label: 'فاشلة', variant: 'destructive', color: 'text-destructive' },
  draft: { label: 'مسودة', variant: 'outline', color: 'text-muted-foreground' },
  cancelled: { label: 'ملغاة', variant: 'outline', color: 'text-muted-foreground' },
};

export const MESSAGE_STATUSES: Record<string, { label: string; variant: BadgeVariant }> = {
  sent: { label: 'مرسل', variant: 'default' },
  failed: { label: 'فشل', variant: 'destructive' },
  pending: { label: 'قيد الانتظار', variant: 'secondary' },
  skipped: { label: 'متخطى', variant: 'outline' },
};

export function getMessageStatusLabel(status: string): string {
  return MESSAGE_STATUSES[status]?.label || status;
}

export function getMessageStatusVariant(status: string): BadgeVariant {
  return MESSAGE_STATUSES[status]?.variant || 'outline';
}

export function getCampaignStatusLabel(status: string): string {
  return CAMPAIGN_STATUSES[status]?.label || status;
}

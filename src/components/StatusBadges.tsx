import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Send } from 'lucide-react';
import { CAMPAIGN_STATUSES, MESSAGE_STATUSES } from '@/lib/statusData';

const CAMPAIGN_ICONS: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="w-4 h-4" />,
  partially_completed: <CheckCircle className="w-4 h-4" />,
  sending: <Send className="w-4 h-4 animate-pulse" />,
  queued: <Clock className="w-4 h-4" />,
  failed: <XCircle className="w-4 h-4" />,
  draft: <Clock className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />,
};

export function CampaignStatusBadge({ status }: { status: string }) {
  const info = CAMPAIGN_STATUSES[status] || { label: status, variant: 'outline' as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

export function CampaignStatusIcon({ status }: { status: string }) {
  const info = CAMPAIGN_STATUSES[status];
  if (!info) return null;
  return <span className={info.color}>{CAMPAIGN_ICONS[status]}</span>;
}

export function CampaignStatusLabel({ status }: { status: string }) {
  const info = CAMPAIGN_STATUSES[status] || { label: status, color: 'text-muted-foreground' };
  return <span className={info.color}>{info.label}</span>;
}

export function MessageStatusBadge({ status }: { status: string }) {
  const info = MESSAGE_STATUSES[status] || { label: status, variant: 'outline' as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

export function ActiveBadge({ isActive, activeLabel = 'نشط', inactiveLabel }: { isActive: boolean; activeLabel?: string; inactiveLabel?: string }) {
  return (
    <Badge variant={isActive ? 'default' : 'secondary'}>
      {isActive ? activeLabel : (inactiveLabel || activeLabel)}
    </Badge>
  );
}

export function RoleBadge({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Badge variant={isAdmin ? 'default' : 'outline'}>
      {isAdmin ? 'مشرف' : 'مستخدم'}
    </Badge>
  );
}

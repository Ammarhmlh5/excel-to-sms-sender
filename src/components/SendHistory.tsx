import { useState } from 'react';
import { useRealtimeCampaigns } from '@/hooks/useRealtimeCampaigns';
import { Send, RefreshCw, Smartphone, Filter } from 'lucide-react';
import CampaignDetail from './CampaignDetail';
import { CampaignStatusIcon, CampaignStatusLabel } from '@/components/StatusBadges';
import { formatDate } from '@/lib/formatDate';
import { Spinner } from '@/components/Spinner';

const SendHistory = () => {
  const { campaigns, loading, refresh } = useRealtimeCampaigns();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<typeof campaigns[0] | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filteredCampaigns = statusFilter === 'all'
    ? campaigns
    : campaigns.filter(c => c.status === statusFilter);

  const statusCounts = campaigns.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="md" color="border-primary" />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Send className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>لا توجد حملات إرسال بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-3 h-3 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-transparent border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">الكل ({campaigns.length})</option>
            <option value="completed">مكتملة ({statusCounts['completed'] || 0})</option>
            <option value="sending">جاري الإرسال ({statusCounts['sending'] || 0})</option>
            <option value="failed">فشلت ({statusCounts['failed'] || 0})</option>
          </select>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <RefreshCw className="w-3 h-3" />
          تحديث
        </button>
      </div>

      {filteredCampaigns.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          لا توجد حملات بهذا الفلتر
        </div>
      ) : (
        filteredCampaigns.map((campaign) => {
          const progress = campaign.contacts_count > 0
            ? Math.round((campaign.sent_count / campaign.contacts_count) * 100)
            : 0;

          return (
            <div
              key={campaign.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => { setSelectedCampaign(campaign); setDetailOpen(true); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedCampaign(campaign); setDetailOpen(true); } }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0">
                  {campaign.source === 'mobile' ? (
                    <Smartphone className="w-4 h-4" />
                  ) : (
                    <CampaignStatusIcon status={campaign.status} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{campaign.name}</span>
                    <CampaignStatusLabel status={campaign.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {campaign.contacts_count} جهة اتصال • {formatDate(campaign.created_at)}
                  </p>
                </div>
              </div>

              <div className="text-left shrink-0">
                <div className="text-sm font-medium">
                  {campaign.sent_count}/{campaign.contacts_count}
                </div>
                {campaign.failed_count > 0 && (
                  <div className="text-xs text-destructive">
                    {campaign.failed_count} فشل
                  </div>
                )}
                {campaign.status === 'sending' && (
                  <div className="w-16 h-1.5 bg-secondary rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      <CampaignDetail
        campaign={selectedCampaign}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDelete={refresh}
      />
    </div>
  );
};

export default SendHistory;

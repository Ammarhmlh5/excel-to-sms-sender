import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/integrations/supabase/client';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Send, CheckCircle, XCircle, Clock, Eye, Plus } from 'lucide-react';
import CampaignDetail from '@/shared/components/CampaignDetail';
import { NewCampaignDialog } from '@/user/components/dashboard/NewCampaignDialog';

interface Campaign {
  id: string;
  name: string;
  status: string;
  contacts_count: number;
  sent_count: number;
  failed_count: number;
  source?: string | null;
  created_at: string | null;
}

export function MyCampaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCampaigns(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Send }> = {
      completed: { variant: 'default', icon: CheckCircle },
      sending: { variant: 'secondary', icon: Send },
      failed: { variant: 'destructive', icon: XCircle },
      draft: { variant: 'outline', icon: Clock },
      pending: { variant: 'outline', icon: Clock },
    };
    const { variant, icon: Icon } = config[status] || config.draft;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getProgress = (campaign: Campaign) => {
    if (campaign.contacts_count === 0) return 0;
    return Math.round(((campaign.sent_count + campaign.failed_count) / campaign.contacts_count) * 100);
  };

  const handleViewDetail = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">حملاتي</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة ومتابعة حملات الإرسال</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {campaigns.length} حملة
          </span>
          <Button onClick={() => setNewCampaignOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            حملة جديدة
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaigns.length}</p>
                <p className="text-xs text-gray-500">إجمالي الحملات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campaigns.filter(c => c.status === 'completed').length}
                </p>
                <p className="text-xs text-gray-500">حملات مكتملة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campaigns.filter(c => c.status === 'sending' || c.status === 'pending').length}
                </p>
                <p className="text-xs text-gray-500">قيد التنفيذ</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الحملات</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد حملات بعد</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">ابدأ بإرسال أول حملة</p>
              <Button onClick={() => setNewCampaignOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                حملة جديدة
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">{campaign.name}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{campaign.contacts_count} جهة اتصال</span>
                      <span className="text-green-600">{campaign.sent_count} مرسلة</span>
                      {campaign.failed_count > 0 && (
                        <span className="text-red-600">{campaign.failed_count} فاشلة</span>
                      )}
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${getProgress(campaign)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-left text-sm text-gray-500">
                    {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString('ar-EG') : ''}
                  </div>
                  <button
                    onClick={() => handleViewDetail(campaign)}
                    className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CampaignDetail
        campaign={selectedCampaign}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <NewCampaignDialog
        open={newCampaignOpen}
        onOpenChange={setNewCampaignOpen}
        onCampaignSent={fetchCampaigns}
      />
    </div>
  );
}

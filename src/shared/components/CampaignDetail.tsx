import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/shared/integrations/supabase/client';
import { Badge } from '@/shared/components/ui/badge';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Send, Filter, Trash2, Download, RotateCw } from 'lucide-react';
import { CampaignMessage, CampaignInfo, CAMPAIGN_MESSAGE_FIELDS } from '@/shared/types/campaign';
import { MessageStatusBadge } from '@/shared/components/StatusBadges';
import { getMessageStatusLabel } from '@/shared/lib/statusData';
import { formatDate } from '@/shared/lib/formatDate';
import { Spinner } from '@/shared/components/Spinner';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

interface CampaignDetailProps {
  campaign: CampaignInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
  adminMode?: boolean;
}

export default function CampaignDetail({ campaign, open, onOpenChange, onDelete, adminMode = false }: CampaignDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<CampaignMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [deliverySummary, setDeliverySummary] = useState<{ sent: number; failed: number; pending: number }>({ sent: 0, failed: 0, pending: 0 });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const PAGE_SIZE = 50;

  const fetchStatusCounts = useCallback(async (campaignId: string) => {
    const { data } = await supabase
      .from('campaign_messages')
      .select('status', { count: 'exact' })
      .eq('campaign_id', campaignId);
    if (data) {
      const counts: Record<string, number> = {};
      for (const m of data) {
        counts[m.status] = (counts[m.status] || 0) + 1;
      }
      setStatusCounts(counts);
    }
  }, []);

  const fetchDeliverySummary = useCallback(async (campaignId: string) => {
    const { data } = await (supabase as any)
      .from('delivery_attempts')
      .select('status, campaign_message_id')
      .in('campaign_message_id', (await supabase.from('campaign_messages').select('id').eq('campaign_id', campaignId)).data?.map((item) => item.id) || []);

    if (data) {
      const summary = data.reduce((acc: { sent: number; failed: number; pending: number }, item: { status: string }) => {
        if (item.status === 'sent') acc.sent += 1;
        else if (item.status === 'failed') acc.failed += 1;
        else acc.pending += 1;
        return acc;
      }, { sent: 0, failed: 0, pending: 0 });
      setDeliverySummary(summary);
    }
  }, []);

  const fetchMessages = useCallback(async (pageNum: number, filter: string) => {
    if (!campaign) return;

    setLoading(true);
    const from = (pageNum - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('campaign_messages')
      .select(CAMPAIGN_MESSAGE_FIELDS, { count: 'exact' })
      .eq('campaign_id', campaign.id)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error, count } = await query;

    if (error) {
      toast({ title: 'خطأ في تحميل الرسائل', description: error.message, variant: 'destructive' });
    } else {
      setMessages(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [campaign, toast]);

  useEffect(() => {
    if (open && campaign) {
      setPage(1);
      setStatusFilter('all');
      fetchMessages(1, 'all');
      fetchStatusCounts(campaign.id);
      fetchDeliverySummary(campaign.id);

      channelRef.current = supabase
        .channel(`campaign-messages-${campaign.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'campaign_messages',
            filter: `campaign_id=eq.${campaign.id}`,
          },
          (payload) => {
            const updated = payload.new as CampaignMessage;
            setMessages(prev =>
              prev.map(m => m.id === updated.id ? updated : m)
            );
          }
        )
        .subscribe();
    } else {
      setMessages([]);
      setTotalCount(0);
      setStatusCounts({});
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [open, campaign, fetchMessages, fetchStatusCounts, fetchDeliverySummary]);

  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    setPage(1);
    fetchMessages(1, filter);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleDelete = async () => {
    if (!user || !campaign) return;
    setDeleteConfirmOpen(false);

    setDeleting(true);
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaign.id)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'خطأ في الحذف', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف', description: 'تم حذف الحملة وجميع رسائلها' });
      onOpenChange(false);
      onDelete?.();
    }
    setDeleting(false);
  };

  const handleRetry = async () => {
    if (!user || !campaign) return;
    const failedCount = statusCounts.failed || 0;
    if (failedCount === 0) {
      toast({ title: 'لا توجد رسائل فاشلة', description: 'جميع الرسائل مُرسلة بالفعل' });
      return;
    }

    setRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke('retry-sms', {
        body: { campaign_id: campaign.id },
      });

      if (error) {
        toast({ title: 'خطأ في إعادة الإرسال', description: error.message, variant: 'destructive' });
        return;
      }

      if (data?.success) {
        toast({ title: 'تمت إعادة الإرسال', description: data.message });
        fetchMessages(page, statusFilter);
        onDelete?.();
      } else {
        toast({ title: 'فشل إعادة الإرسال', description: data?.error || 'خطأ غير معروف', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'تعذر الاتصال بالخادم', variant: 'destructive' });
    }
    setRetrying(false);
  };

  const exportCSV = () => {
    const rows = messages.map((msg, idx) => ({
      '#': (page - 1) * PAGE_SIZE + idx + 1,
      'الهاتف': msg.phone,
      'الاسم': msg.name || '',
      'الرسالة': msg.message,
      'الحالة': getMessageStatusLabel(msg.status),
      'خطأ': msg.error || '',
      'تاريخ الإرسال': msg.sent_at ? formatDate(msg.sent_at) : '',
    }));

    const headers = Object.keys(rows[0] || {});
    const csvContent = [
      '\uFEFF' + headers.join(','),
      ...rows.map(row => headers.map(h => `"${String(row[h as keyof typeof row] ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign?.name || 'campaign'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{campaign?.name || 'تفاصيل الحملة'}</DialogTitle>
              <DialogDescription>
                {campaign && `${campaign.contacts_count} جهة اتصال • ${formatDate(campaign.created_at)}`}
              </DialogDescription>
            </div>
            {!adminMode && campaign && (
              <div className="flex items-center gap-1">
                {(statusCounts.failed || 0) > 0 && (
                  <button
                    onClick={handleRetry}
                    disabled={retrying}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    title="إعادة إرسال الفاشلة"
                  >
                    <RotateCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
                  </button>
                )}
                <button
                  onClick={exportCSV}
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  title="تصدير CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={deleting}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                  title="حذف الحملة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            {adminMode && campaign && (
              <button
                onClick={exportCSV}
                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                title="تصدير CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" color="border-primary" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3 h-3 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <Badge variant="secondary">محاولات: {deliverySummary.sent + deliverySummary.failed + deliverySummary.pending}</Badge>
                <Badge variant="default">تمت: {deliverySummary.sent}</Badge>
                <Badge variant="destructive">فشلت: {deliverySummary.failed}</Badge>
                <Badge variant="outline">قيد الانتظار: {deliverySummary.pending}</Badge>
              </div>
              <button
                onClick={() => handleFilterChange('all')}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  statusFilter === 'all'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                الكل ({statusFilter === 'all' ? totalCount : (statusCounts.all || Object.values(statusCounts).reduce((a, b) => a + b, 0))})
              </button>
              {['sent', 'failed', 'pending'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleFilterChange(status)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    statusFilter === status
                      ? status === 'failed'
                        ? 'border-destructive bg-destructive/10 text-destructive'
                        : 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {getMessageStatusLabel(status)} ({statusCounts[status] || 0})
                </button>
              ))}
            </div>

            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Send className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد رسائل</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">#</TableHead>
                      <TableHead className="text-right">الهاتف</TableHead>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">الرسالة</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">خطأ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map((msg, idx) => (
                      <TableRow key={msg.id}>
                        <TableCell className="text-muted-foreground">{(page - 1) * PAGE_SIZE + idx + 1}</TableCell>
                        <TableCell className="font-mono text-sm" dir="ltr">{msg.phone}</TableCell>
                        <TableCell>{msg.name || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={msg.message}>
                          {msg.message}
                        </TableCell>
                        <TableCell>
                          <MessageStatusBadge status={msg.status} />
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-destructive text-xs" title={msg.error || ''}>
                          {msg.error || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  صفحة {page} من {totalPages} ({totalCount} رسالة)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { const p = page - 1; setPage(p); fetchMessages(p, statusFilter); }}
                    disabled={page <= 1}
                    className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:border-primary/50 disabled:opacity-40"
                  >
                    السابق
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const p = start + i;
                    if (p > totalPages) return null;
                    return (
                      <button
                        key={p}
                        onClick={() => { setPage(p); fetchMessages(p, statusFilter); }}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          p === page
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => { const p = page + 1; setPage(p); fetchMessages(p, statusFilter); }}
                    disabled={page >= totalPages}
                    className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:border-primary/50 disabled:opacity-40"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={deleteConfirmOpen}
      onOpenChange={setDeleteConfirmOpen}
      title="حذف الحملة"
      description="هل أنت متأكد من حذف هذه الحملة؟ سيتم حذف جميع الرسائل المرتبطة بها."
      onConfirm={handleDelete}
      loading={deleting}
    />
    </>
  );
}

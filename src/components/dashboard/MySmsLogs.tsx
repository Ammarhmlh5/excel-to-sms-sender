import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, XCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SmsLog {
  id: string;
  recipients_count: number;
  message_template: string | null;
  status: string;
  created_at: string;
}

export function MySmsLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const pageSize = 20;

  useEffect(() => {
    fetchLogs();
  }, [user, page, statusFilter]);

  const fetchLogs = async () => {
    if (!user) return;

    let query = supabase
      .from('sms_logs')
      .select('*, api_keys!inner(user_id)', { count: 'exact' })
      .eq('api_keys.user_id', user.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error, count } = await query;

    if (!error && data) {
      setLogs(data);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive'; icon: typeof CheckCircle }> = {
      sent: { variant: 'default', icon: CheckCircle },
      failed: { variant: 'destructive', icon: XCircle },
      pending: { variant: 'secondary', icon: FileText },
    };
    const { variant, icon: Icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const totalPages = Math.ceil(totalCount / pageSize);

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
          <h1 className="text-2xl font-bold text-gray-900">سجل الإرسال</h1>
          <p className="text-sm text-gray-500 mt-1">سجل رسائل SMS المرسلة</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{totalCount} رسالة</span>
          <Button size="sm" className="gap-2" onClick={() => setPage(1)}>
            <Plus className="w-4 h-4" />
            تحديث
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>السجلات</CardTitle>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="all">الكل</option>
            <option value="sent">مرسلة</option>
            <option value="failed">فاشلة</option>
            <option value="pending">قيد الانتظار</option>
          </select>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد سجلات</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">عدد المستلمين</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">الرسالة</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">الحالة</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-sm">{log.recipients_count}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate" title={log.message_template || ''}>
                          {log.message_template || '—'}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(log.status)}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {new Date(log.created_at).toLocaleDateString('ar-EG')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    صفحة {page} من {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                    >
                      السابق
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                    >
                      التالي
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

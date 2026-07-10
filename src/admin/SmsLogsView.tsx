import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LogEntry {
  id: string;
  user_id: string;
  recipients_count: number;
  status: string;
  created_at: string;
  message_template: string | null;
}

const statusBadge = (status: string) => {
  const m: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    sent: 'default',
    pending: 'outline',
    failed: 'destructive',
  };
  const labels: Record<string, string> = {
    sent: 'مرسلة',
    pending: 'قيد الانتظار',
    failed: 'فاشلة',
  };
  return <Badge variant={m[status] || 'outline'}>{labels[status] || status}</Badge>;
};

const PAGE_SIZE = 25;

const SmsLogsView = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let countQuery = supabase.from('sms_logs').select('*', { count: 'exact', head: true });
        let dataQuery = supabase.from('sms_logs').select('*');

        if (statusFilter !== 'all') {
          countQuery = countQuery.eq('status', statusFilter);
          dataQuery = dataQuery.eq('status', statusFilter);
        }

        const offset = (page - 1) * PAGE_SIZE;
        const [{ count }, { data }] = await Promise.all([
          countQuery,
          dataQuery.order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1),
        ]);

        if (data) setLogs(data);
        if (count !== null) setTotal(count);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, [page, statusFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">سجلات الإرسال</h1>
          <p className="text-muted-foreground mt-1">جميع عمليات إرسال الرسائل SMS</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="تصفية بالحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="sent">مرسلة</SelectItem>
              <SelectItem value="failed">فاشلة</SelectItem>
              <SelectItem value="pending">قيد الانتظار</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            السجلات
            <span className="text-muted-foreground text-sm mr-2">({total})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">عدد المستلمين</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">نموذج الرسالة</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">جارٍ التحميل...</TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">لا توجد سجلات</TableCell>
                </TableRow>
              ) : (
                logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.recipients_count}</TableCell>
                    <TableCell>{statusBadge(l.status)}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-muted-foreground text-xs">
                      {l.message_template || '—'}
                    </TableCell>
                    <TableCell>{new Date(l.created_at).toLocaleString('ar-EG')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronRight className="w-4 h-4 ml-1" />
            السابق
          </Button>
          <span className="text-sm text-muted-foreground px-3">الصفحة {page} من {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            التالي
            <ChevronLeft className="w-4 h-4 mr-1" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default SmsLogsView;

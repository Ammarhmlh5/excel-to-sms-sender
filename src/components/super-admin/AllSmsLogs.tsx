import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Pagination from '@/components/Pagination';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageStatusBadge } from '@/components/StatusBadges';
import { formatDate } from '@/lib/formatDate';

interface LogEntry {
  id: string;
  user_id: string;
  recipients_count: number;
  status: string;
  created_at: string;
  message_template: string | null;
}

const PAGE_SIZE = 25;

export function AllSmsLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async (p: number, status: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'list_sms_logs', page: p, limit: PAGE_SIZE, status },
      });
      if (!error && data) {
        setLogs(data.logs);
        setTotal(data.total);
      } else {
        toast.error(error?.message || 'فشل في جلب السجلات');
      }
    } catch {
      toast.error('فشل في جلب السجلات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page, statusFilter);
  }, [page, statusFilter, fetchLogs]);

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
                    <TableCell><MessageStatusBadge status={l.status} /></TableCell>
                    <TableCell className="max-w-[300px] truncate text-muted-foreground text-xs">
                      {l.message_template || '—'}
                    </TableCell>
                    <TableCell>{formatDate(l.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

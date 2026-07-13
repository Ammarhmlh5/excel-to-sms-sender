import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/shared/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import Pagination from '@/shared/components/Pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/shared/components/ui/table';
import { formatDate } from '@/shared/lib/formatDate';
import { Button } from '@/shared/components/ui/button';

interface DeadLetter {
  id: string;
  campaign_message_id: string;
  delivery_attempt_id?: string;
  provider?: string;
  channel?: string;
  error_message?: string;
  response_data?: any;
  created_at: string;
}

const PAGE_SIZE = 25;

export function DeadLetters() {
  const [rows, setRows] = useState<DeadLetter[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const fetchDLQ = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dead-letters', {
        body: { action: 'list', page: p, limit: PAGE_SIZE },
      });
      if (!error && data) {
        setRows(data.data || []);
        // simple total estimation
        setTotal((p - 1) * PAGE_SIZE + (data.data?.length || 0));
      } else {
        toast.error(error?.message || 'فشل في جلب DLQ');
      }
    } catch (e) {
      toast.error('فشل في جلب DLQ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDLQ(page); }, [page, fetchDLQ]);

  const requeue = async (id: string) => {
    if (!confirm('إعادة إدراج الرسالة إلى قائمة الانتظار؟')) return;
    try {
      const { data, error } = await supabase.functions.invoke('dead-letters', { body: { action: 'requeue', id } });
      if (!error && data) {
        toast.success('أعيد إدراج الرسالة');
        fetchDLQ(page);
      } else {
        toast.error(error?.message || 'فشل إعادة الإدراج');
      }
    } catch (e) {
      toast.error('فشل إعادة الإدراج');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = (on: boolean) => {
    const map: Record<string, boolean> = {};
    rows.forEach(r => { map[r.id] = on; });
    setSelected(map);
  };

  const exportCsv = () => {
    const header = ['id', 'campaign_message_id', 'delivery_attempt_id', 'provider', 'channel', 'error_message', 'created_at'];
    const selectedRows = rows.filter(r => selected[r.id]);
    const dataRows = (selectedRows.length ? selectedRows : rows).map(r => [r.id, r.campaign_message_id, r.delivery_attempt_id || '', r.provider || '', r.channel || '', (r.error_message || '').replace(/\n/g, ' '), r.created_at]);
    const csv = [header.join(','), ...dataRows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dead_letters_page_${page}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const bulkRequeue = async () => {
    const ids = Object.keys(selected).filter(id => selected[id]);
    if (ids.length === 0) {
      toast.error('لم يتم اختيار أي عنصر لإعادة الإدراج');
      return;
    }
    if (!confirm(`إعادة إدراج ${ids.length} رسالة إلى قائمة الانتظار؟`)) return;
    setLoading(true);
    try {
      for (const id of ids) {
        await supabase.functions.invoke('dead-letters', { body: { action: 'requeue', id } });
      }
      toast.success('تمت إعادة إدراج العناصر المحددة');
      setSelected({});
      fetchDLQ(page);
    } catch (e) {
      toast.error('حدث خطأ أثناء إعادة الإدراج');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">قائمة الرسائل الميتة (DLQ)</h1>
          <p className="text-muted-foreground mt-1">عرض الرسائل التي استنفدت محاولات الإرسال</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => selectAll(true)}>تحديد الكل</Button>
          <Button size="sm" onClick={() => selectAll(false)}>إلغاء التحديد</Button>
          <Button size="sm" onClick={exportCsv}>تصدير CSV</Button>
          <Button size="sm" onClick={bulkRequeue} disabled={loading}>إعادة إدراج المحدد</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">قائمة DLQ <span className="text-sm text-muted-foreground">({total})</span></CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead className="text-right">الخطأ</TableHead>
                <TableHead className="text-right">المزوّد</TableHead>
                <TableHead className="text-right">القناة</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">جارٍ التحميل...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد رسائل</TableCell></TableRow>
              ) : rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="w-8">
                    <input type="checkbox" checked={!!selected[r.id]} onChange={() => toggleSelect(r.id)} />
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">{r.error_message || '—'}</TableCell>
                  <TableCell>{r.provider || '—'}</TableCell>
                  <TableCell>{r.channel || '—'}</TableCell>
                  <TableCell>{formatDate(r.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => requeue(r.id)}>إعادة الإدراج</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Search, ChevronLeft, ChevronRight,
} from 'lucide-react';

interface Campaign {
  id: string;
  user_id: string;
  name: string;
  status: string;
  contacts_count: number;
  sent_count: number;
  failed_count: number;
  source: string | null;
  created_at: string;
}

const statusBadge = (status: string) => {
  const m: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    completed: { variant: 'default', label: 'مكتملة' },
    partially_completed: { variant: 'default', label: 'مكتملة جزئياً' },
    sending: { variant: 'secondary', label: 'جارٍ الإرسال' },
    queued: { variant: 'outline', label: 'بانتظار' },
    failed: { variant: 'destructive', label: 'فاشلة' },
    draft: { variant: 'outline', label: 'مسودة' },
    cancelled: { variant: 'outline', label: 'ملغاة' },
  };
  const info = m[status] || { variant: 'outline' as const, label: status };
  return <Badge variant={info.variant}>{info.label}</Badge>;
};

const sourceLabel = (s: string | null) => {
  if (s === 'excel_upload') return 'رفع Excel';
  if (s === 'mobile') return 'تطبيق موبايل';
  if (s === 'api') return 'API';
  return s || '—';
};

const PAGE_SIZE = 20;

const CampaignsOverview = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('campaigns')
          .select('*', { count: 'exact' });

        if (search) {
          query = query.ilike('name', `%${search}%`);
        }

        const offset = (page - 1) * PAGE_SIZE;
        const { data, count } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (data) setCampaigns(data);
        if (count !== null) setTotal(count);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, [page, search]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الحملات</h1>
          <p className="text-muted-foreground mt-1">جميع حملات الإرسال على المنصة</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث باسم الحملة..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pr-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            جميع الحملات
            <span className="text-muted-foreground text-sm mr-2">({total})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">المصدر</TableHead>
                <TableHead className="text-right">جهات الاتصال</TableHead>
                <TableHead className="text-right">تم الإرسال</TableHead>
                <TableHead className="text-right">فشل</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">جارٍ التحميل...</TableCell>
                </TableRow>
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {search ? 'لا توجد نتائج' : 'لا توجد حملات بعد'}
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{c.name}</TableCell>
                    <TableCell>{statusBadge(c.status)}</TableCell>
                    <TableCell>{sourceLabel(c.source)}</TableCell>
                    <TableCell>{c.contacts_count}</TableCell>
                    <TableCell>{c.sent_count}</TableCell>
                    <TableCell>{c.failed_count}</TableCell>
                    <TableCell>{new Date(c.created_at).toLocaleDateString('ar-EG')}</TableCell>
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

export default CampaignsOverview;

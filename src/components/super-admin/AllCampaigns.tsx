import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search } from 'lucide-react';
import { CampaignInfo } from '@/types/campaign';
import { CampaignStatusBadge } from '@/components/StatusBadges';
import { formatDateShort } from '@/lib/formatDate';
import CampaignDetail from '@/components/CampaignDetail';
import Pagination from '@/components/Pagination';

const sourceLabel = (s: string | null | undefined) => {
  if (s === 'excel_upload') return 'رفع Excel';
  if (s === 'mobile') return 'تطبيق موبايل';
  if (s === 'api') return 'API';
  return s || '—';
};

const PAGE_SIZE = 20;

export function AllCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignInfo | null>(null);

  const fetchCampaigns = useCallback(async (p: number, s: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'list_campaigns', page: p, search: s, limit: PAGE_SIZE },
      });
      if (!error && data) {
        setCampaigns(data.campaigns);
        setTotal(data.total);
      } else {
        toast.error(error?.message || 'فشل في جلب الحملات');
      }
    } catch {
      toast.error('فشل في جلب الحملات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns(page, search);
  }, [page, search, fetchCampaigns]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 300);
  };

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

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
            onChange={(e) => handleSearch(e.target.value)}
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
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedCampaign(c)}
                  >
                    <TableCell className="font-medium max-w-[200px] truncate">{c.name}</TableCell>
                    <TableCell><CampaignStatusBadge status={c.status} /></TableCell>
                    <TableCell>{sourceLabel(c.source)}</TableCell>
                    <TableCell>{c.contacts_count}</TableCell>
                    <TableCell>{c.sent_count}</TableCell>
                    <TableCell>{c.failed_count}</TableCell>
                    <TableCell>{formatDateShort(c.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <CampaignDetail
        campaign={selectedCampaign}
        open={!!selectedCampaign}
        onOpenChange={(open) => { if (!open) setSelectedCampaign(null); }}
        adminMode
      />
    </div>
  );
}

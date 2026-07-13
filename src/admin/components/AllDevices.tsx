import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/shared/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import Pagination from '@/shared/components/Pagination';
import { Input } from '@/shared/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import { Search } from 'lucide-react';
import { formatDate } from '@/shared/lib/formatDate';

interface Device {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string | null;
  hardware_id: string | null;
  platform: string | null;
  app_version: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
}

const PAGE_SIZE = 30;

export function AllDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDevices = useCallback(async (p: number, s: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'list_devices', page: p, search: s, limit: PAGE_SIZE },
      });
      if (!error && data) {
        setDevices(data.devices);
        setTotal(data.total);
      } else {
        toast.error(error?.message || 'فشل في جلب الأجهزة');
      }
    } catch {
      toast.error('فشل في جلب الأجهزة');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices(page, search);
  }, [page, search, fetchDevices]);

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
      <div>
        <h1 className="text-3xl font-bold text-foreground">الأجهزة</h1>
        <p className="text-muted-foreground mt-1">جميع الأجهزة المسجلة على المنصة</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              الأجهزة
              <span className="text-muted-foreground text-sm mr-2">({total})</span>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="بحث بالاسم أو المنصة..."
                className="pl-9 w-48 h-8 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اسم الجهاز</TableHead>
                <TableHead className="text-right">معرّف الجهاز</TableHead>
                <TableHead className="text-right">المنصة</TableHead>
                <TableHead className="text-right">النسخة</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">آخر ظهور</TableHead>
                <TableHead className="text-right">تاريخ التسجيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">جارٍ التحميل...</TableCell>
                </TableRow>
              ) : devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد أجهزة مسجلة</TableCell>
                </TableRow>
              ) : (
                devices.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.device_name || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{d.device_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.platform || '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{d.app_version || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={d.is_active ? 'default' : 'secondary'}>
                        {d.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {d.last_seen_at ? formatDate(d.last_seen_at) : '—'}
                    </TableCell>
                    <TableCell>{formatDate(d.created_at)}</TableCell>
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

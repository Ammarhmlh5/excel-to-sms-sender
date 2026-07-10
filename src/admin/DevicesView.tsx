import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

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

const DevicesView = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDevices = useCallback(async (p: number, s: string) => {
    setLoading(true);
    const offset = (p - 1) * PAGE_SIZE;

    let countQuery = supabase
      .from('device_push_tokens')
      .select('*', { count: 'exact', head: true });

    let dataQuery = supabase
      .from('device_push_tokens')
      .select('*')
      .order('last_seen_at', { ascending: false, nullsLast: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (s) {
      const filter = `device_name.ilike.%${s}%,device_id.ilike.%${s}%,platform.ilike.%${s}%`;
      countQuery = countQuery.or(filter);
      dataQuery = dataQuery.or(filter);
    }

    const [{ count }, { data }] = await Promise.all([countQuery, dataQuery]);
    if (data) setDevices(data);
    setTotal(count || 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDevices(page, search);
  }, [page, search, fetchDevices]);

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
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
                      {d.last_seen_at ? new Date(d.last_seen_at).toLocaleDateString('ar-EG') : '—'}
                    </TableCell>
                    <TableCell>{new Date(d.created_at).toLocaleDateString('ar-EG')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                صفحة {page} من {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DevicesView;

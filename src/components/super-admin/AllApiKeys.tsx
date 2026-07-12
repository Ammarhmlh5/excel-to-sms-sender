import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Pagination from '@/components/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ToggleLeft, ToggleRight, Search } from 'lucide-react';
import { formatDate } from '@/lib/formatDate';
import { Spinner } from '@/components/Spinner';

interface ApiKeyRow {
  id: string;
  user_id: string;
  key_name: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
}

const PAGE_SIZE = 30;

export function AllApiKeys() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchKeys = useCallback(async (p: number, s: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'list_api_keys', page: p, search: s, limit: PAGE_SIZE },
      });
      if (!error && data) {
        setKeys(data.keys);
        setTotal(data.total);
      } else {
        toast.error(error?.message || 'فشل في جلب مفاتيح API');
      }
    } catch {
      toast.error('فشل في جلب مفاتيح API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys(page, search);
  }, [page, search, fetchKeys]);

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

  const toggleKey = async (keyId: string, currentActive: boolean) => {
    setActionLoading(keyId);
    try {
      const { error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'toggle_api_key', key_id: keyId, is_active: !currentActive },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('تم تغيير حالة المفتاح');
        fetchKeys(page, search);
      }
    } catch {
      toast.error('فشلت العملية');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">مفاتيح API</h1>
        <p className="text-muted-foreground mt-1">إدارة مفاتيح API لجميع المستخدمين</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              جميع المفاتيح
              <span className="text-muted-foreground text-sm mr-2">({total})</span>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="بحث بالاسم..."
                className="pl-9 w-48 h-8 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">المفتاح</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">جارٍ التحميل...</TableCell>
                </TableRow>
              ) : keys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد مفاتيح API</TableCell>
                </TableRow>
              ) : (
                keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.key_name || '—'}</TableCell>
                    <TableCell dir="ltr" className="text-xs font-mono max-w-[200px] truncate">
                      {k.api_key.substring(0, 4)}****{k.api_key.slice(-4)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={k.is_active ? 'default' : 'secondary'}>
                        {k.is_active ? 'نشط' : 'معطل'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(k.created_at)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actionLoading === k.id}
                        onClick={() => toggleKey(k.id, k.is_active)}
                      >
                        {actionLoading === k.id ? (
                          <Spinner size="sm" className="ml-1" />
                        ) : k.is_active ? (
                          <ToggleRight className="w-4 h-4 ml-1" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 ml-1" />
                        )}
                        {k.is_active ? 'تعطيل' : 'تفعيل'}
                      </Button>
                    </TableCell>
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

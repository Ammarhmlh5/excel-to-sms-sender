import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ToggleLeft, ToggleRight, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface ApiKeyRow {
  id: string;
  user_id: string;
  key_name: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
}

const PAGE_SIZE = 30;

const ApiKeysView = () => {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchKeys = useCallback(async (p: number, s: string) => {
    setLoading(true);
    const offset = (p - 1) * PAGE_SIZE;

    let countQuery = supabase
      .from('api_keys')
      .select('*', { count: 'exact', head: true });

    let dataQuery = supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (s) {
      const filter = `key_name.ilike.%${s}%,api_key.ilike.%${s}%`;
      countQuery = countQuery.or(filter);
      dataQuery = dataQuery.or(filter);
    }

    const [{ count }, { data }] = await Promise.all([countQuery, dataQuery]);
    if (data) setKeys(data);
    setTotal(count || 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKeys(page, search);
  }, [page, search, fetchKeys]);

  const toggleKey = async (keyId: string, currentActive: boolean) => {
    setActionLoading(keyId);
    try {
      const { error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'toggle_api_key', key_id: keyId, is_active: !currentActive },
      });
      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم التحديث', description: 'تم تغيير حالة المفتاح' });
        fetchKeys(page, search);
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشلت العملية', variant: 'destructive' });
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
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
                      {k.api_key.substring(0, 30)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant={k.is_active ? 'default' : 'secondary'}>
                        {k.is_active ? 'نشط' : 'معطل'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(k.created_at).toLocaleDateString('ar-EG')}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actionLoading === k.id}
                        onClick={() => toggleKey(k.id, k.is_active)}
                      >
                        {actionLoading === k.id ? (
                          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin ml-1" />
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

export default ApiKeysView;

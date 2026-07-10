import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Search, Eye, Shield, ShieldOff, ChevronLeft, ChevronRight,
} from 'lucide-react';

interface User {
  user_id: string;
  full_name: string | null;
  company_name: string | null;
  created_at: string;
  user_roles?: { role: string }[];
}

interface ListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_SIZE = 20;

const UsersManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async (p: number, s: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'list_users', page: p, search: s, limit: PAGE_SIZE },
      });
      if (!error && data) {
        const res = data as ListResponse;
        setUsers(res.users);
        setTotal(res.total);
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في جلب المستخدمين', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers(page, search);
  }, [page, search, fetchUsers]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase.functions.invoke('admin-manage-users', {
        body: {
          action: 'set_role',
          user_id: userId,
          role: isAdmin ? 'user' : 'admin',
        },
      });
      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: isAdmin ? 'تم إزالة صلاحية المشرف' : 'تم منح صلاحية المشرف' });
        fetchUsers(page, search);
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشلت العملية', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">المستخدمون</h1>
          <p className="text-muted-foreground mt-1">إدارة حسابات المستخدمين</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الشركة..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            جميع المستخدمين
            <span className="text-muted-foreground text-sm mr-2">({total})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">الشركة</TableHead>
                <TableHead className="text-right">الصلاحيات</TableHead>
                <TableHead className="text-right">تاريخ التسجيل</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    جارٍ التحميل...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {search ? 'لا توجد نتائج للبحث' : 'لا يوجد مستخدمون بعد'}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  const roles = u.user_roles?.map(r => r.role) || [];
                  const isAdmin = roles.includes('admin');
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                      <TableCell>{u.company_name || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {isAdmin && <Badge variant="default">مشرف</Badge>}
                          {!isAdmin && <Badge variant="outline">مستخدم</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(u.created_at).toLocaleDateString('ar-EG')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/users/${u.user_id}`)}
                          >
                            <Eye className="w-4 h-4 ml-1" />
                            تفاصيل
                          </Button>
                          <Button
                            variant={isAdmin ? 'destructive' : 'outline'}
                            size="sm"
                            disabled={actionLoading === u.user_id}
                            onClick={() => toggleAdmin(u.user_id, isAdmin)}
                          >
                            {actionLoading === u.user_id ? (
                              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin ml-1" />
                            ) : isAdmin ? (
                              <ShieldOff className="w-4 h-4 ml-1" />
                            ) : (
                              <Shield className="w-4 h-4 ml-1" />
                            )}
                            {isAdmin ? 'إزالة صلاحية' : 'منح صلاحية'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronRight className="w-4 h-4 ml-1" />
            السابق
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            الصفحة {page} من {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            التالي
            <ChevronLeft className="w-4 h-4 mr-1" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, Eye, Shield, ShieldOff } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { toggleAdminRole } from '@/lib/adminActions';
import { formatDate } from '@/lib/formatDate';
import { Spinner } from '@/components/Spinner';
import { RoleBadge } from '@/components/StatusBadges';

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

export function UsersManagement() {
  const navigate = useNavigate();
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
      toast.error('فشل في جلب المستخدمين');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page, search);
  }, [page, search, fetchUsers]);

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

  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    setActionLoading(userId);
    await toggleAdminRole(userId, isAdmin, () => fetchUsers(page, search));
    setActionLoading(null);
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
                        <RoleBadge isAdmin={isAdmin} />
                      </TableCell>
                      <TableCell>
                        {formatDate(u.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/super-admin/users/${u.user_id}`)}
                          >
                            <Eye className="w-4 h-4 ml-1" />
                            تفاصيل
                          </Button>
                          <Button
                            variant={isAdmin ? 'destructive' : 'outline'}
                            size="sm"
                            disabled={actionLoading === u.user_id}
                            onClick={() => handleToggleAdmin(u.user_id, isAdmin)}
                          >
                            {actionLoading === u.user_id ? (
                              <Spinner size="sm" className="ml-1" />
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

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Eye, Shield, ShieldOff } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { toggleAdminRole } from '@/lib/adminActions';
import { Spinner } from '@/components/Spinner';
import { RoleBadge } from '@/components/StatusBadges';

interface UserWithRoles {
  user_id: string;
  full_name: string | null;
  roles: string[];
}

const PAGE_SIZE = 25;

export function RolesManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'list_users', page: p, search: '', limit: PAGE_SIZE },
      });
      if (!error && data) {
        const mapped: UserWithRoles[] = (data.users || []).map((u: { user_id: string; full_name: string | null; user_roles?: { role: string }[] }) => ({
          user_id: u.user_id,
          full_name: u.full_name,
          roles: (u.user_roles || []).map((r: { role: string }) => r.role),
        }));
        setUsers(mapped);
        setTotal(data.total || 0);
      }
    } catch {
      toast.error('فشل في جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    setActionLoading(userId);
    await toggleAdminRole(userId, isAdmin, () => fetchData(page));
    setActionLoading(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">الصلاحيات</h1>
        <p className="text-muted-foreground mt-1">إدارة صلاحيات المشرفين على النظام</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            المستخدمون والصلاحيات
            <span className="text-muted-foreground text-sm mr-2">({total})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">الصلاحيات</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">جارٍ التحميل...</TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">لا توجد بيانات</TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  const isAdmin = u.roles.includes('admin');
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                      <TableCell>
                        <RoleBadge isAdmin={isAdmin} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/super-admin/users/${u.user_id}`)}
                          >
                            <Eye className="w-4 h-4 ml-1" />
                            التفاصيل
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

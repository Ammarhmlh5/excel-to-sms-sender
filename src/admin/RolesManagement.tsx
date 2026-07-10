import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Eye, Shield, ShieldOff } from 'lucide-react';

interface UserWithRoles {
  user_id: string;
  full_name: string | null;
  roles: string[];
}

const RolesManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'list_users', page: 1, search: '', limit: 100 },
      });
      if (!error && data) {
        const mapped: UserWithRoles[] = (data.users || []).map((u: { user_id: string; full_name: string | null; user_roles?: { role: string }[] }) => ({
          user_id: u.user_id,
          full_name: u.full_name,
          roles: (u.user_roles || []).map((r: { role: string }) => r.role),
        }));
        setUsers(mapped);
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في جلب البيانات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'set_role', user_id: userId, role: isAdmin ? 'user' : 'admin' },
      });
      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: isAdmin ? 'تم إزالة صلاحية المشرف' : 'تم منح صلاحية المشرف' });
        fetchData();
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشلت العملية', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
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
            <span className="text-muted-foreground text-sm mr-2">({users.length})</span>
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
                        <div className="flex gap-1">
                          {isAdmin && <Badge variant="default">مشرف</Badge>}
                          {!isAdmin && <Badge variant="outline">مستخدم</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/users/${u.user_id}`)}
                          >
                            <Eye className="w-4 h-4 ml-1" />
                            التفاصيل
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
    </div>
  );
};

export default RolesManagement;

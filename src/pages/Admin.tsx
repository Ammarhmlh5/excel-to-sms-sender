import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Users, MessageSquare, KeyRound, ArrowLeft } from 'lucide-react';

interface Stats {
  users: number;
  smsLogs: number;
  apiKeys: number;
}

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  company_name: string | null;
  created_at: string;
}

const Admin = () => {
  const [stats, setStats] = useState<Stats>({ users: 0, smsLogs: 0, apiKeys: 0 });
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [{ count: usersCount }, { count: smsCount }, { count: keysCount }, { data: profilesData }] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('sms_logs').select('*', { count: 'exact', head: true }),
          supabase.from('api_keys').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('user_id, full_name, company_name, created_at').order('created_at', { ascending: false }).limit(50),
        ]);

        setStats({
          users: usersCount ?? 0,
          smsLogs: smsCount ?? 0,
          apiKeys: keysCount ?? 0,
        });
        setProfiles(profilesData ?? []);
      } catch (error) {
        console.error('Admin page failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">لوحة تحكم الأدمن</h1>
              <p className="text-muted-foreground text-sm">إدارة النظام والمستخدمين</p>
            </div>
          </div>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              العودة للتطبيق
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">المستخدمون</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.users}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">سجلات الرسائل</CardTitle>
              <MessageSquare className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.smsLogs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">مفاتيح API</CardTitle>
              <KeyRound className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.apiKeys}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>آخر المستخدمين المسجلين</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">جارٍ التحميل...</div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">لا توجد بيانات</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">الشركة</TableHead>
                    <TableHead className="text-right">تاريخ التسجيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => (
                    <TableRow key={p.user_id}>
                      <TableCell>{p.full_name ?? '—'}</TableCell>
                      <TableCell>{p.company_name ?? '—'}</TableCell>
                      <TableCell>{new Date(p.created_at).toLocaleDateString('ar-EG')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
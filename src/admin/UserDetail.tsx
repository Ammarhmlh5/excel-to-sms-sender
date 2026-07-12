import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Shield, ShieldOff, ToggleLeft, ToggleRight } from 'lucide-react';
import { CampaignStatusBadge, MessageStatusBadge } from '@/components/StatusBadges';
import { formatDate } from '@/lib/formatDate';
import { toggleAdminRole } from '@/lib/adminActions';
import { Spinner } from '@/components/Spinner';

interface UserDetailData {
  profile: {
    user_id: string;
    full_name: string | null;
    company_name: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  apiKeys: Array<{
    id: string;
    key_name: string;
    api_key: string;
    is_active: boolean;
    created_at: string;
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    contacts_count: number;
    sent_count: number;
    failed_count: number;
    source: string | null;
    created_at: string;
  }>;
  devices: Array<{
    id: string;
    device_id: string;
    device_name: string | null;
    platform: string | null;
    is_active: boolean;
    last_seen_at: string | null;
    created_at: string;
  }>;
  links: Array<{
    id: string;
    external_platform: string;
    external_user_id: string;
    external_email: string | null;
    is_verified: boolean;
    linked_at: string;
  }>;
  roles: Array<{ role: string }>;
  smsLogsCount: number;
  recentLogs: Array<{
    id: string;
    recipients_count: number;
    status: string;
    created_at: string;
  }>;
  rateLimits: Array<{
    window_start: string;
    messages_sent: number;
    requests_made: number;
  }>;
}

const UserDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const [data, setData] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      try {
        const { data: result, error } = await supabase.functions.invoke('admin-manage-users', {
          body: { action: 'get_user', user_id: userId },
        });
        if (!error && result) {
          setData(result as UserDetailData);
        } else {
          toast({ title: 'خطأ', description: error?.message || 'فشل في جلب بيانات المستخدم', variant: 'destructive' });
        }
      } catch {
        toast({ title: 'خطأ', description: 'فشل في جلب بيانات المستخدم', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, toast]);

  const toggleApiKey = async (keyId: string, active: boolean) => {
    setActionLoading(keyId);
    try {
      const { error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'toggle_api_key', key_id: keyId, is_active: !active },
      });
      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم تحديث حالة المفتاح' });
        // Refresh
        const { data: fresh } = await supabase.functions.invoke('admin-manage-users', {
          body: { action: 'get_user', user_id: userId },
        });
        if (fresh) setData(fresh as UserDetailData);
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشلت العملية', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleRole = async (isAdmin: boolean) => {
    if (!userId) return;
    setActionLoading('role');
    await toggleAdminRole(userId, isAdmin, async () => {
      const { data: fresh } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'get_user', user_id: userId },
      });
      if (fresh) setData(fresh as UserDetailData);
    });
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" color="border-primary" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-muted-foreground">المستخدم غير موجود</div>;
  }

  const profile = data.profile;
  const roles = data.roles.map(r => r.role);
  const isAdmin = roles.includes('admin');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link to="/admin/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 ml-1" />
            عودة
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {profile?.full_name || 'مستخدم غير معروف'}
          </h1>
          <p className="text-muted-foreground mt-1">معرّف: {userId}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">الحملات</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.campaigns.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">رسائل مرسلة</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.smsLogsCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">مفاتيح API</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.apiKeys.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">الأجهزة</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.devices.length}</div></CardContent>
        </Card>
      </div>

      {/* Role actions */}
      <div className="flex gap-3">
        <Button
          variant={isAdmin ? 'destructive' : 'default'}
          size="sm"
          disabled={actionLoading === 'role'}
          onClick={() => handleToggleRole(isAdmin)}
        >
          {actionLoading === 'role' ? (
            <Spinner size="sm" className="ml-1" />
          ) : isAdmin ? (
            <ShieldOff className="w-4 h-4 ml-1" />
          ) : (
            <Shield className="w-4 h-4 ml-1" />
          )}
          {isAdmin ? 'إزالة صلاحية المشرف' : 'منح صلاحية المشرف'}
        </Button>
      </div>

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="campaigns">الحملات</TabsTrigger>
          <TabsTrigger value="api-keys">مفاتيح API</TabsTrigger>
          <TabsTrigger value="logs">سجلات الإرسال</TabsTrigger>
          <TabsTrigger value="devices">الأجهزة</TabsTrigger>
          <TabsTrigger value="links">الحسابات المرتبطة</TabsTrigger>
          <TabsTrigger value="rate-limits">حدود الإرسال</TabsTrigger>
        </TabsList>

        {/* Campaigns tab */}
        <TabsContent value="campaigns">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">جهات الاتصال</TableHead>
                    <TableHead className="text-right">تم الإرسال</TableHead>
                    <TableHead className="text-right">فشل</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.campaigns.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد حملات</TableCell></TableRow>
                  ) : (
                    data.campaigns.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell><CampaignStatusBadge status={c.status} /></TableCell>
                        <TableCell>{c.contacts_count}</TableCell>
                        <TableCell>{c.sent_count}</TableCell>
                        <TableCell>{c.failed_count}</TableCell>
                        <TableCell>{formatDate(c.created_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys tab */}
        <TabsContent value="api-keys">
          <Card>
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
                  {data.apiKeys.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد مفاتيح API</TableCell></TableRow>
                  ) : (
                    data.apiKeys.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.key_name || '—'}</TableCell>
                        <TableCell dir="ltr" className="text-xs font-mono">{k.api_key.substring(0, 20)}...</TableCell>
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
                            onClick={() => toggleApiKey(k.id, k.is_active)}
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
        </TabsContent>

        {/* Logs tab */}
        <TabsContent value="logs">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">عدد المستلمين</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">لا توجد سجلات إرسال</TableCell></TableRow>
                  ) : (
                    data.recentLogs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{l.recipients_count}</TableCell>
                        <TableCell><MessageStatusBadge status={l.status} /></TableCell>
                        <TableCell>{formatDate(l.created_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="p-3 text-sm text-muted-foreground">
                إجمالي السجلات: {data.smsLogsCount}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devices tab */}
        <TabsContent value="devices">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">معرّف الجهاز</TableHead>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">المنصة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">آخر ظهور</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.devices.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد أجهزة</TableCell></TableRow>
                  ) : (
                    data.devices.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">{d.device_id}</TableCell>
                        <TableCell>{d.device_name || '—'}</TableCell>
                        <TableCell>{d.platform || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={d.is_active ? 'default' : 'secondary'}>
                            {d.is_active ? 'نشط' : 'غير نشط'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {d.last_seen_at ? formatDate(d.last_seen_at) : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Links tab */}
        <TabsContent value="links">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المنصة</TableHead>
                    <TableHead className="text-right">المعرف</TableHead>
                    <TableHead className="text-right">البريد</TableHead>
                    <TableHead className="text-right">موثوق</TableHead>
                    <TableHead className="text-right">تاريخ الربط</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.links.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد حسابات مرتبطة</TableCell></TableRow>
                  ) : (
                    data.links.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{l.external_platform}</TableCell>
                        <TableCell className="font-mono text-xs">{l.external_user_id}</TableCell>
                        <TableCell>{l.external_email || '—'}</TableCell>
                        <TableCell>
                          {l.is_verified ? 'نعم' : 'لا'}
                        </TableCell>
                        <TableCell>{formatDate(l.linked_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rate Limits tab */}
        <TabsContent value="rate-limits">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">نافذة زمنية</TableHead>
                    <TableHead className="text-right">الرسائل المرسلة</TableHead>
                    <TableHead className="text-right">الطلبات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rateLimits.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">لا توجد سجلات حد إرسال</TableCell></TableRow>
                  ) : (
                    data.rateLimits.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{formatDate(r.window_start)}</TableCell>
                        <TableCell>{r.messages_sent}</TableCell>
                        <TableCell>{r.requests_made}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserDetail;

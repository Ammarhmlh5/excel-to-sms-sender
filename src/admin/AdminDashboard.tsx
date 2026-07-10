import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users, MessageSquare, KeyRound, Shield,
  Smartphone, Megaphone,
} from 'lucide-react';

interface Stats {
  users: number;
  campaigns: number;
  smsSent: number;
  apiKeys: number;
  devices: number;
  admins: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('admin-manage-users', {
          body: { action: 'get_stats' },
        });
        if (!error && data) {
          setStats(data);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { label: 'المستخدمون', value: stats?.users ?? 0, icon: Users, color: 'text-blue-500' },
    { label: 'الحملات', value: stats?.campaigns ?? 0, icon: Megaphone, color: 'text-green-500' },
    { label: 'رسائل مرسلة', value: stats?.smsSent ?? 0, icon: MessageSquare, color: 'text-purple-500' },
    { label: 'مفاتيح API', value: stats?.apiKeys ?? 0, icon: KeyRound, color: 'text-amber-500' },
    { label: 'الأجهزة', value: stats?.devices ?? 0, icon: Smartphone, color: 'text-cyan-500' },
    { label: 'المشرفون', value: stats?.admins ?? 0, icon: Shield, color: 'text-red-500' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground mt-1">نظرة عامة على النظام وإدارة المستخدمين</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-muted animate-pulse rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {card.value.toLocaleString('ar-SA')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <h3 className="font-semibold text-foreground mb-2">مرحباً بك في لوحة المشرف</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          يمكنك من هنا إدارة جميع المستخدمين، عرض الحملات، مراقبة سجلات الإرسال،
          وإدارة مفاتيح API والأجهزة المسجلة. جميع العمليات الحساسة تتم عبر
          خدمة آمنة بخدمة مخصصة (Edge Function) تتحقق من صلاحية المشرف قبل التنفيذ.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;

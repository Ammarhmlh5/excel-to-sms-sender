import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { supabase } from '@/shared/integrations/supabase/client';
import { toast } from 'sonner';

interface AllowedDomainItem {
  id: string;
  domain: string;
  company_name: string | null;
  is_active: boolean;
  created_at: string;
}

export function SendingChannelsAdmin() {
  const [items, setItems] = useState<AllowedDomainItem[]>([]);
  const [domain, setDomain] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({ api_key: '', sender_id: '', base_url: '' });
  const [settingsLoading, setSettingsLoading] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setLoading(false);
      return;
    }

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-company-domains?action=list`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });
    const payload = await res.json();
    if (res.ok) {
      setItems(payload.items || []);
    } else {
      toast.error(payload.error || 'تعذر تحميل المسارات');
    }
    setLoading(false);
  };

  const loadHudhudSettings = async () => {
    setSettingsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setSettingsLoading(false);
      return;
    }

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-hudhud-settings?action=get`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });
    const payload = await res.json();
    if (res.ok) {
      const json = payload.item?.settings_json || {};
      setSettings({
        api_key: json.api_key || '',
        sender_id: json.sender_id || '',
        base_url: json.base_url || '',
      });
    }
    setSettingsLoading(false);
  };

  useEffect(() => {
    loadItems();
    loadHudhudSettings();
  }, []);

  const handleCreate = async () => {
    if (!domain.trim()) {
      toast.error('يرجى إدخال المسار الرئيسي');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-company-domains?action=create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ domain, company_name: companyName }),
    });

    const payload = await res.json();
    if (res.ok) {
      toast.success('تمت إضافة المسار بنجاح');
      setDomain('');
      setCompanyName('');
      loadItems();
    } else {
      toast.error(payload.error || 'تعذر إضافة المسار');
    }
  };

  const handleDelete = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-company-domains?action=delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ id }),
    });

    const payload = await res.json();
    if (res.ok) {
      toast.success('تم حذف المسار');
      loadItems();
    } else {
      toast.error(payload.error || 'تعذر حذف المسار');
    }
  };

  const handleSaveHudhudSettings = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-hudhud-settings?action=save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ settings: settings }),
    });

    const payload = await res.json();
    if (res.ok) {
      toast.success('تم حفظ إعدادات Hudhud');
    } else {
      toast.error(payload.error || 'تعذر حفظ إعدادات Hudhud');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">وسائط الإرسال</h2>
        <p className="text-sm text-gray-500 mt-1">إدارة المسارات الأساسية للشركات التي يمكن ربطها لاحقًا من واجهة المستخدم</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>إضافة مسار رئيسي</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">المسار الرئيسي</label>
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="gmail.com أو alhudhudai.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">اسم الشركة</label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="اسم الشركة اختياري" />
            </div>
          </div>
          <Button onClick={handleCreate}>إضافة المسار</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إعدادات Hudhud</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">مفتاح API</label>
              <Input type="password" value={settings.api_key} onChange={(e) => setSettings({ ...settings, api_key: e.target.value })} placeholder="HUDHUD_API_KEY" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">معرّف المرسل</label>
              <Input value={settings.sender_id} onChange={(e) => setSettings({ ...settings, sender_id: e.target.value })} placeholder="Sender ID" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">الرابط الأساسي</label>
            <Input value={settings.base_url} onChange={(e) => setSettings({ ...settings, base_url: e.target.value })} placeholder="https://example.com/api/sms/send" />
          </div>
          <Button onClick={handleSaveHudhudSettings} disabled={settingsLoading}>{settingsLoading ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</Button>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-medium">رابط Webhook لاستقبال حالات التسليم من Hudhud</p>
            <p className="mt-2 break-all">{`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-provider`}</p>
            <p className="mt-2 text-xs text-blue-700">استخدم هذا العنوان في لوحة Hudhud لإنهاء تكامل webhook.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>المسارات المسموح بها</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">جارٍ التحميل...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500">لا توجد مسارات مضافة بعد.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{item.domain}</p>
                    <p className="text-sm text-gray-500">{item.company_name || 'بدون اسم شركة'}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)}>حذف</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

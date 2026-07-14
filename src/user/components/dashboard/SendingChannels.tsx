import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { supabase } from '@/shared/integrations/supabase/client';
import { toast } from 'sonner';

interface AllowedDomainItem {
  id: string;
  domain: string;
  company_name: string | null;
  is_active: boolean;
}

export function SendingChannels() {
  const [items, setItems] = useState<AllowedDomainItem[]>([]);
  const [loading, setLoading] = useState(false);

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
      toast.error(payload.error || 'تعذر تحميل المسارات المتاحة');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">وسائط الإرسال</h2>
        <p className="text-sm text-gray-500 mt-1">الشركات والمسارات المسموح بها التي يمكنك اختيارها وربطها لاحقًا</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الشركات المسموح بها</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">جارٍ التحميل...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500">لا توجد شركات متاحة حاليًا.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <p className="font-medium">{item.domain}</p>
                  <p className="text-sm text-gray-500">{item.company_name || 'شركة غير مسماة'}</p>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-gray-500">هذه القائمة تُدار من قبل مشرف النظام، ولا يمكن للمستخدم تعديل إعدادات Hudhud أو تكوين القنوات.</p>
        </CardContent>
      </Card>
    </div>
  );
}

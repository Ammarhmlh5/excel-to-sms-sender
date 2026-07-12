import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Device {
  id: string;
  device_id: string;
  platform: string;
  device_name: string;
  app_version: string;
  is_active: boolean;
  last_seen: string;
  created_at: string;
}

export function MyDevices() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDevices();
  }, [user]);

  const fetchDevices = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('device_push_tokens')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDevices(data);
    }
    setLoading(false);
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!confirm('هل أنت متأكد من إزالة هذا الجهاز؟')) return;

    const { error } = await supabase
      .from('device_push_tokens')
      .update({ is_active: false })
      .eq('id', deviceId);

    if (error) {
      toast.error('فشل إزالة الجهاز');
    } else {
      toast.success('تم إزالة الجهاز');
      fetchDevices();
    }
  };

  const getPlatformIcon = (platform: string) => {
    return platform === 'android' ? '🤖' : '🍎';
  };

  const getStatusBadge = (isActive: boolean, lastSeen: string) => {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffHours = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60);
    const isOnline = diffHours < 24;

    if (!isActive) {
      return <Badge variant="secondary"><XCircle className="w-3 h-3 ml-1" /> معطل</Badge>;
    }
    if (isOnline) {
      return <Badge variant="default"><CheckCircle className="w-3 h-3 ml-1" /> متصل</Badge>;
    }
    return <Badge variant="outline"><XCircle className="w-3 h-3 ml-1" /> غير متصل</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">أجهزتي</h1>
          <p className="text-sm text-gray-500 mt-1">الأجهزة المسجلة لحسابك</p>
        </div>
        <div className="text-sm text-gray-500">
          {devices.length} جهاز
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الأجهزة المسجلة</CardTitle>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <div className="text-center py-12">
              <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد أجهزة مسجلة</p>
              <p className="text-sm text-gray-400 mt-1">سجّل جهازك من تطبيق موبايل الهدهد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">
                    {getPlatformIcon(device.platform)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">{device.device_name || device.device_id}</h3>
                      {getStatusBadge(device.is_active, device.last_seen)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="capitalize">{device.platform}</span>
                      {device.app_version && <span>v{device.app_version}</span>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                      <span>
                        آخر اتصال: {new Date(device.last_seen).toLocaleString('ar-EG')}
                      </span>
                      <span>
                        مسجل منذ: {new Date(device.created_at).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  </div>
                  {device.is_active && (
                    <button
                      onClick={() => handleRemoveDevice(device.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

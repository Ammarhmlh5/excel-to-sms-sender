import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Key, Plus, Trash2, Eye, EyeOff, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface ApiKey {
  id: string;
  api_key: string;
  key_name: string;
  is_active: boolean;
  created_at: string;
}

export function MyApiKeys() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, [user]);

  const fetchKeys = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setKeys(data);
    }
    setLoading(false);
  };

  const generateApiKey = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'hloov_';
    for (let i = 0; i < 32; i++) {
      result += chars[array[i] % chars.length];
    }
    return result;
  };

  const handleCreateKey = async () => {
    if (!user || !newKeyName.trim()) return;

    setIsCreating(true);
    const newKey = generateApiKey();

    const { error } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        api_key: newKey,
        key_name: newKeyName.trim(),
        is_active: true,
      });

    if (error) {
      toast.error('فشل إنشاء المفتاح');
    } else {
      toast.success('تم إنشاء المفتاح بنجاح');
      setNewKeyName('');
      fetchKeys();
    }
    setIsCreating(false);
  };

  const handleDeleteKey = async () => {
    if (!deleteTarget) return;
    setDeleteConfirmOpen(false);

    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', deleteTarget);

    if (error) {
      toast.error('فشل حذف المفتاح');
    } else {
      toast.success('تم حذف المفتاح');
      fetchKeys();
    }
    setDeleteTarget(null);
  };

  const handleToggleActive = async (keyId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: !currentStatus })
      .eq('id', keyId);

    if (error) {
      toast.error('فشل تحديث المفتاح');
    } else {
      fetchKeys();
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('تم النسخ');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        toast.success('تم النسخ');
      } catch {
        toast.error('فشل نسخ المفتاح');
      }
      document.body.removeChild(textarea);
    }
  };

  const maskKey = (key: string) => {
    if (showKey === key) return key;
    return key.substring(0, 8) + '****' + key.substring(key.length - 4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مفاتيح API</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة مفاتيح API الخاصة بك</p>
        </div>
        <div className="text-sm text-gray-500">
          {keys.length} مفتاح
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>إنشاء مفتاح جديد</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="اسم المفتاح (مثال: تطبيق الموبايل)"
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
              dir="rtl"
            />
            <Button
              onClick={handleCreateKey}
              disabled={!newKeyName.trim() || isCreating}
            >
              <Plus className="w-4 h-4 ml-2" />
              إنشاء مفتاح
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>المفاتيح الحالية</CardTitle>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد مفاتيح</p>
              <p className="text-sm text-gray-400 mt-1">أنشئ مفتاحًا جديدًا للبدء</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">{key.key_name}</h3>
                      <Badge variant={key.is_active ? 'default' : 'secondary'}>
                        {key.is_active ? 'نشط' : 'معطل'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                        {maskKey(key.api_key)}
                      </code>
                      <button
                        onClick={() => setShowKey(showKey === key.api_key ? null : key.api_key)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        {showKey === key.api_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(key.api_key)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      أُنشئ في {new Date(key.created_at).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(key.id, key.is_active)}
                    >
                      {key.is_active ? 'تعطيل' : 'تفعيل'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setDeleteTarget(key.id); setDeleteConfirmOpen(true); }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    <ConfirmDialog
      open={deleteConfirmOpen}
      onOpenChange={setDeleteConfirmOpen}
      title="حذف المفتاح"
      description="هل أنت متأكد من حذف هذا المفتاح؟"
      onConfirm={handleDeleteKey}
    />
    </>
  );
}

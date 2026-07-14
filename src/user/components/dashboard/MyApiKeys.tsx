import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/integrations/supabase/client';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Spinner } from '@/shared/components/Spinner';
import { Key, Plus, Trash2, Eye, EyeOff, Copy, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

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
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
  const [showApiDocs, setShowApiDocs] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('فشل تحميل المفاتيح');
    } else {
      setKeys(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const testApiKey = async (apiKey: string) => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${window.location.origin}/functions/v1/verify-api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      });

      const data = await response.json();

      if (data.valid) {
        setTestResult({
          success: true,
          message: `صالح - المستخدم: ${data.user?.name || data.user?.email || 'غير معروف'}`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'مفتاح غير صالح',
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: 'خطأ في الاتصال بالخادم',
      });
    } finally {
      setTesting(false);
    }
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

    setIsCreating(false);

    if (error) {
      toast.error(error.message || 'فشل إنشاء المفتاح');
    } else {
      toast.success('تم إنشاء المفتاح بنجاح');
      setNewKeyName('');
      setCreateConfirmOpen(false);
      fetchKeys();
    }
  };

  const handleDeleteKey = async () => {
    if (!deleteTarget) return;
    setDeleteConfirmOpen(false);
    setActionLoading(deleteTarget);

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
    setActionLoading(null);
  };

  const handleToggleActive = async (keyId: string, currentStatus: boolean) => {
    setActionLoading(keyId);
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: !currentStatus })
      .eq('id', keyId);

    if (error) {
      toast.error('فشل تحديث المفتاح');
    } else {
      fetchKeys();
    }
    setActionLoading(null);
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
        <Spinner size="lg" />
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
              onClick={() => setCreateConfirmOpen(true)}
              disabled={!newKeyName.trim() || isCreating}
            >
              <Plus className="w-4 h-4 ml-2" />
              إنشاء مفتاح
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <button
          onClick={() => setShowApiDocs(!showApiDocs)}
          className="w-full flex items-center justify-between p-4 text-right hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-gray-900">ربط الحساب مع منصات أخرى</span>
          </div>
          {showApiDocs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showApiDocs && (
          <CardContent className="pt-0">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm" dir="ltr">
              <p className="text-gray-700 font-medium">استخدم المفتاح للتحقق من الحساب عبر API:</p>

              <div className="bg-white rounded border p-3">
                <p className="text-xs text-gray-500 mb-1">Endpoint</p>
                <code className="text-sm text-blue-700 break-all">
                  POST {window.location.origin}/functions/v1/verify-api-key
                </code>
              </div>

              <div className="bg-white rounded border p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500">curl</p>
                  <button
                    onClick={() => copyToClipboard(`curl -X POST ${window.location.origin}/functions/v1/verify-api-key -H "Content-Type: application/json" -d '{"api_key": "YOUR_API_KEY"}'`)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    نسخ
                  </button>
                </div>
                <pre className="text-xs text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">{`curl -X POST ${window.location.origin}/functions/v1/verify-api-key \\
  -H "Content-Type: application/json" \\
  -d '{"api_key": "YOUR_API_KEY"}'`}</pre>
              </div>

              <div className="bg-white rounded border p-3">
                <p className="text-xs text-gray-500 mb-1">Response (200)</p>
                <pre className="text-xs text-gray-800 overflow-x-auto">{`{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "الاسم"
  },
  "key": {
    "id": "uuid",
    "name": "اسم المفتاح"
  }
}`}</pre>
              </div>

              <div className="bg-white rounded border p-3">
                <p className="text-xs text-gray-500 mb-1">أكواد الاستجابة</p>
                <div className="space-y-1 text-xs">
                  <p><span className="text-green-600 font-mono">200</span> — مفتاح صالح</p>
                  <p><span className="text-red-600 font-mono">400</span> — بيانات ناقصة</p>
                  <p><span className="text-red-600 font-mono">401</span> — مفتاح غير صالح</p>
                  <p><span className="text-red-600 font-mono">403</span> — مفتاح معطل</p>
                  <p><span className="text-red-600 font-mono">429</span> — تجاوز الحد المسموح</p>
                </div>
              </div>

              <p className="text-xs text-gray-400">الحد المسموح: 10 طلبات/ساعة لكل عنوان IP</p>
            </div>
          </CardContent>
        )}
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
                      onClick={() => testApiKey(key.api_key)}
                      disabled={testing || actionLoading === key.id}
                    >
                      {testing ? '...' : 'اختبار'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(key.id, key.is_active)}
                      disabled={actionLoading === key.id}
                    >
                      {actionLoading === key.id ? '...' : key.is_active ? 'تعطيل' : 'تفعيل'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setDeleteTarget(key.id); setDeleteConfirmOpen(true); }}
                      className="text-red-600 hover:text-red-700"
                      disabled={actionLoading === key.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {testResult && (
            <div className={`mt-4 p-3 rounded text-sm ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {testResult.message}
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
    <ConfirmDialog
      open={createConfirmOpen}
      onOpenChange={setCreateConfirmOpen}
      title="إنشاء مفتاح جديد"
      description={`هل تريد إنشاء مفتاح جديد باسم "${newKeyName.trim()}"؟`}
      onConfirm={handleCreateKey}
      loading={isCreating}
      variant="default"
    />
    </>
  );
}

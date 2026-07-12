import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Lock, Settings, Key, CheckCircle, Link, Send, Wifi, WifiOff, BarChart3 } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import LinkedAccounts from '@/components/LinkedAccounts';
import RateLimitDisplay from '@/components/RateLimitDisplay';
import { Spinner } from '@/components/Spinner';
import { PasswordInput } from '@/components/PasswordInput';


const passwordSchema = z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');

interface SettingsDialogProps {
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  savedApiKeyId: string | null;
}

const SettingsDialog = ({ apiKey, onApiKeyChange, savedApiKeyId }: SettingsDialogProps) => {
  useAuth();
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localApiKey, setLocalApiKey] = useState(apiKey);

  useEffect(() => {
    setLocalApiKey(apiKey);
  }, [apiKey]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      passwordSchema.parse(newPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('كلمات المرور غير متطابقة');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('تم تغيير كلمة المرور بنجاح');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    try {
      toast.loading('جاري حفظ مفتاح API...');
      await onApiKeyChange(localApiKey);
      toast.success('تم حفظ مفتاح API بنجاح');
    } catch {
      toast.error('فشل حفظ مفتاح API');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">الإعدادات</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>الإعدادات</DialogTitle>
          <DialogDescription>
            إدارة إعدادات حسابك ومفتاح API
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="gateway" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="gateway" className="gap-1 text-xs">
              <Send className="w-3 h-3" />
              البوابة
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-1 text-xs">
              <BarChart3 className="w-3 h-3" />
              الحصة
            </TabsTrigger>
            <TabsTrigger value="api-key" className="gap-1 text-xs">
              <Key className="w-3 h-3" />
              API
            </TabsTrigger>
            <TabsTrigger value="linked-accounts" className="gap-1 text-xs">
              <Link className="w-3 h-3" />
              الربط
            </TabsTrigger>
            <TabsTrigger value="password" className="gap-1 text-xs">
              <Lock className="w-3 h-3" />
              كلمة المرور
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usage" className="mt-4">
            <RateLimitDisplay />
          </TabsContent>

          <TabsContent value="gateway" className="space-y-6 mt-4">
            {/* Connection Status Indicator */}
            <div className={`rounded-lg p-4 border-2 ${savedApiKeyId ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20' : 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20'}`}>
              <div className="flex items-center gap-3">
                {savedApiKeyId ? (
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                    <WifiOff className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-sm">
                    {savedApiKeyId ? 'البوابة متصلة' : 'البوابة غير مُعدّة'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {savedApiKeyId ? 'جاهز لإرسال الرسائل' : 'أضف مفتاح API للبدء'}
                  </p>
                </div>
              </div>
            </div>

            {/* Default Gateway Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Send className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">بوابة الهدهد SMS</h4>
                  <p className="text-xs text-muted-foreground">hloov.com</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">رابط الإرسال:</span>
                  <code className="bg-background px-2 py-0.5 rounded text-foreground">https://www.hloov.com/api/sms/send</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الحد الأقصى:</span>
                  <span className="text-foreground">1000 رسالة/طلب</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الحالة:</span>
                  <span className={savedApiKeyId ? 'text-green-600' : 'text-yellow-600'}>
                    {savedApiKeyId ? 'نشط' : 'في انتظار المفتاح'}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="api-key" className="space-y-4 mt-4">
            {/* API Key Info Card */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3 border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-sm">بوابة الهدهد SMS</h4>
                  <p className="text-xs text-muted-foreground">hloov.com</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Endpoint: <span className="font-mono text-foreground">https://www.hloov.com/api/sms/send</span></p>
                <p>الحد الأقصى: 1000 رسالة/طلب</p>
              </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Key className="w-4 h-4 text-primary" />
                مفتاح API للبوابة
              </label>
              <PasswordInput
                value={localApiKey}
                onChange={setLocalApiKey}
                placeholder="أدخل مفتاح API هنا..."
                className="text-base font-mono"
                name="hudhud_api_key"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                احصل على مفتاح API من لوحة تحكم بوابة الهدهد
              </p>
              {savedApiKeyId && (
                <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 dark:bg-green-950/20 p-2 rounded">
                  <CheckCircle className="w-3 h-3" />
                  <span>مفتاح API مُفعّل وجاهز للإرسال</span>
                </div>
              )}
            </div>

            <Button onClick={handleSaveApiKey} className="w-full h-12" disabled={!localApiKey.trim()}>
              {savedApiKeyId ? 'تحديث مفتاح API' : 'حفظ مفتاح API'}
            </Button>

            {/* Test Connection */}
            {savedApiKeyId && (
              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  className="w-full h-10"
                  onClick={async () => {
                    try {
                      toast.loading('جاري التحقق من المفتاح...', { id: 'test-connection' });
                      const { data, error } = await supabase
                        .from('api_keys')
                        .select('id, api_key')
                        .eq('id', savedApiKeyId)
                        .eq('is_active', true)
                        .single();
                      if (error || !data || !data.api_key) {
                        toast.error('المفتاح غير موجود أو معطل', { id: 'test-connection' });
                      } else if (data.api_key.length < 10) {
                        toast.error('المفتاح قصير جداً — تأكد من صحته', { id: 'test-connection' });
                      } else {
                        toast.success('المفتاح محفوظ ونشط — سيُختبر بشكل كامل عند أول إرسال', { id: 'test-connection' });
                      }
                    } catch {
                      toast.error('فشل التحقق', { id: 'test-connection' });
                    }
                  }}
                >
                  <svg className="w-4 h-4 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  اختبار الاتصال
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="password" className="space-y-4 mt-4">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Lock className="w-4 h-4 text-primary" />
                  كلمة مرور الحساب الجديدة
                </label>
                <PasswordInput
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Lock className="w-4 h-4 text-primary" />
                  تأكيد كلمة مرور الحساب
                </label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                كلمة المرور هذه تُستخدم لتسجيل الدخول إلى حسابك في مرسال الهدهد
              </p>

              <Button
                type="submit"
                className="w-full h-12"
                disabled={loading}
              >
                {loading ? (
                  <Spinner size="sm" color="border-primary-foreground" />
                ) : (
                  'تغيير كلمة المرور'
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="linked-accounts" className="mt-4">
            <LinkedAccounts />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Lock, Eye, EyeOff, Settings, Key, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';

const passwordSchema = z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');

interface SettingsDialogProps {
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  savedApiKeyId: string | null;
}

const SettingsDialog = ({ apiKey, onApiKeyChange, savedApiKeyId }: SettingsDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
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
    } catch (error) {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = () => {
    onApiKeyChange(localApiKey);
    toast.success('تم حفظ مفتاح API بنجاح');
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

        <Tabs defaultValue="api-key" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="api-key" className="gap-2">
              <Key className="w-4 h-4" />
              مفتاح API
            </TabsTrigger>
            <TabsTrigger value="password" className="gap-2">
              <Lock className="w-4 h-4" />
              كلمة المرور
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-key" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Key className="w-4 h-4 text-primary" />
                مفتاح API لمنصة الهدهد
              </label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  placeholder="أدخل مفتاح API الخاص بمنصة الهدهد..."
                  className="pl-12 h-12 text-base"
                  dir="ltr"
                  name="hudhud_api_key"
                  autoComplete="off"
                  data-lpignore="true"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded transition-colors"
                >
                  {showApiKey ? (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                هذا المفتاح يُستخدم لإرسال الرسائل عبر منصة الهدهد. يمكنك الحصول عليه من لوحة تحكم منصة الهدهد.
              </p>
              {savedApiKeyId && (
                <div className="flex items-center gap-2 text-xs text-primary">
                  <CheckCircle className="w-3 h-3" />
                  <span>مفتاح API محفوظ في حسابك</span>
                </div>
              )}
            </div>
            <Button onClick={handleSaveApiKey} className="w-full h-12" disabled={!localApiKey.trim()}>
              حفظ مفتاح API
            </Button>
          </TabsContent>

          <TabsContent value="password" className="space-y-4 mt-4">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Lock className="w-4 h-4 text-primary" />
                  كلمة مرور الحساب الجديدة
                </label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 pl-12"
                    dir="ltr"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded transition-colors"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Eye className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Lock className="w-4 h-4 text-primary" />
                  تأكيد كلمة مرور الحساب
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 pl-12"
                    dir="ltr"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Eye className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
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
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  'تغيير كلمة المرور'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;

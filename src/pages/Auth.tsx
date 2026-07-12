import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { Spinner } from '@/components/Spinner';
import { PasswordInput } from '@/components/PasswordInput';
import { z } from 'zod';

const emailSchema = z.string().email('البريد الإلكتروني غير صالح');
const passwordSchema = z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const validateInputs = (includePassword = true) => {
    try {
      emailSchema.parse(email);
      if (includePassword) {
        passwordSchema.parse(password);
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(e => e.message).join('، ');
        toast.error(messages);
      }
      return false;
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateInputs(false)) return;
    
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني');
      setIsForgotPassword(false);
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateInputs()) return;
    
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          if (error.message === 'Email not confirmed') {
            toast.error('البريد الإلكتروني غير مؤكد. يرجى التحقق من بريدك أو التواصل مع الدعم');
          } else {
            toast.error('خطأ في تسجيل الدخول: ' + error.message);
          }
          return;
        }
        
        toast.success('تم تسجيل الدخول بنجاح');
      } else {
        const { data: emailExists } = await supabase
          .rpc('check_email_exists', { p_email: email });

        if (emailExists) {
          toast.error('هذا البريد الإلكتروني مسجّل بالفعل. سجّل دخولك أو استخدم بريداً آخر');
          setLoading(false);
          return;
        }

        const redirectUrl = `${window.location.origin}/`;
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: fullName,
            },
          },
        });
        
        if (error) {
          if (error.message.includes('already') || error.message.includes('registered')) {
            toast.error('هذا البريد الإلكتروني مسجّل بالفعل. سجّل دخولك');
          } else {
            toast.error(`خطأ إنشاء الحساب: ${error.message}`);
          }
          return;
        }

        if (data.user && !data.session) {
          if (data.user.email_confirmed_at) {
            toast.error('هذا البريد الإلكتروني مسجّل بالفعل. سجّل دخولك');
            setIsLogin(true);
          } else {
            toast.success('تم إنشاء الحساب بنجاح. يرجى تسجيل الدخول');
            setIsLogin(true);
          }
          return;
        }
        if (!data.user) {
          toast.error('فشل إنشاء الحساب. يرجى المحاولة مرة أخرى');
          return;
        }
      }
    } catch (error) {
      toast.error(`حدث خطأ غير متوقع: ${error instanceof Error ? error.message : 'يرجى المحاولة مرة أخرى'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">مرسال الهدهد</h1>
          <p className="text-muted-foreground">إرسال رسائل SMS جماعية بسهولة</p>
        </div>

        <Card className="border-primary/20 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isForgotPassword 
                ? 'استعادة كلمة المرور' 
                : isLogin 
                  ? 'تسجيل الدخول' 
                  : 'إنشاء حساب جديد'}
            </CardTitle>
            <CardDescription>
              {isForgotPassword
                ? 'أدخل بريدك الإلكتروني لإرسال رابط استعادة كلمة المرور'
                : isLogin 
                  ? 'أدخل بياناتك للوصول إلى حسابك' 
                  : 'أنشئ حساباً جديداً للبدء في إرسال الرسائل'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              key={isForgotPassword ? 'forgot' : isLogin ? 'login' : 'register'}
              onSubmit={isForgotPassword ? handleForgotPassword : handleAuth}
              className="space-y-4"
              autoComplete="off"
            >
              {!isLogin && !isForgotPassword && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <User className="w-4 h-4 text-primary" />
                    الاسم الكامل
                  </label>
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="أدخل اسمك الكامل"
                    className="h-12"
                    required={!isLogin}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="w-4 h-4 text-primary" />
                  البريد الإلكتروني
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="h-12"
                  dir="ltr"
                  required
                  name="email"
                  autoComplete="email"
                />
              </div>

              {!isForgotPassword && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Lock className="w-4 h-4 text-primary" />
                    كلمة المرور
                  </label>
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    placeholder="••••••••"
                    required
                    name="password"
                    autoComplete="current-password"
                  />
                </div>
              )}

              {isLogin && !isForgotPassword && (
                <div className="text-left">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-primary hover:underline text-sm"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-lg gap-2"
                disabled={loading}
              >
                {loading ? (
                  <Spinner size="sm" color="border-white" />
                ) : (
                  <>
                    {isForgotPassword 
                      ? 'إرسال رابط الاستعادة' 
                      : isLogin 
                        ? 'دخول' 
                        : 'إنشاء حساب'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              {isForgotPassword ? (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-primary hover:underline text-sm"
                >
                  العودة لتسجيل الدخول
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary hover:underline text-sm"
                >
                  {isLogin 
                    ? 'ليس لديك حساب؟ سجل الآن' 
                    : 'لديك حساب بالفعل؟ سجل دخولك'}
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;

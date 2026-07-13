import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/integrations/supabase/client';
import { useAuth } from '@/shared/hooks/useAuth';
import { useIsAdmin } from '@/admin/hooks/useIsAdmin';
import { toast } from 'sonner';
import { Shield, Eye, EyeOff, AlertTriangle, Fingerprint } from 'lucide-react';
import { Spinner } from '@/shared/components/Spinner';

const RATE_WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const AdminAuth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [shake, setShake] = useState(false);

  const failedAttemptsRef = useRef<number[]>([]);
  const isRateLimitedRef = useRef(false);

  const checkRateLimit = useCallback((): boolean => {
    if (isRateLimitedRef.current) {
      toast.error('تم حظر تسجيل الدخول مؤقتاً. يرجى الانتظار 5 دقائق');
      return true;
    }
    const now = Date.now();
    failedAttemptsRef.current = failedAttemptsRef.current.filter(
      (t) => now - t < RATE_WINDOW_MS
    );
    if (failedAttemptsRef.current.length >= MAX_ATTEMPTS) {
      isRateLimitedRef.current = true;
      toast.error('تم حظر تسجيل الدخول مؤقتاً. يرجى الانتظار 5 دقائق');
      setTimeout(() => {
        isRateLimitedRef.current = false;
        failedAttemptsRef.current = [];
      }, RATE_WINDOW_MS);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (authLoading || adminLoading) return;
    if (user && isAdmin) {
      navigate('/super-admin', { replace: true });
    }
  }, [user, authLoading, isAdmin, adminLoading, navigate]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccessDenied(false);

    if (!email.trim() || !password.trim()) {
      toast.error('يرجى ملء جميع الحقول');
      triggerShake();
      return;
    }

    if (checkRateLimit()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        failedAttemptsRef.current.push(Date.now());
        triggerShake();
        if (error.message === 'Email not confirmed') {
          toast.error('البريد الإلكتروني غير مؤكد');
        } else {
          toast.error('بيانات الدخول غير صحيحة');
        }
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        await supabase.auth.signOut();
        setAccessDenied(true);
        triggerShake();
        toast.error('ليس لديك صلاحية الوصول لهذه الواجهة');
        return;
      }

      toast.success('تم تسجيل الدخول بنجاح');
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080b14' }}>
        <Spinner size="lg" color="border-white" />
      </div>
    );
  }

  if (user && isAdmin) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#080b14' }}
      dir="rtl"
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
      <div className="absolute bottom-[-200px] left-[-100px] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />

      <div className={`w-full max-w-sm relative ${shake ? 'animate-shake' : ''}`} style={{
        animation: shake ? 'shake 0.5s ease-in-out' : 'none',
      }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
              style={{ background: 'linear-gradient(135deg, #2563eb, #6366f1)' }}>
              <Shield className="w-10 h-10 text-white" />
              <div className="absolute inset-0 rounded-2xl" style={{
                boxShadow: '0 0 40px rgba(37,99,235,0.4), 0 0 80px rgba(99,102,241,0.2)',
              }} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mt-5 mb-1 tracking-tight">لوحة المشرف</h1>
          <p className="text-sm" style={{ color: '#475569' }}>مرسال الهدهد — إدارة النظام</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 relative" style={{
          background: 'rgba(15,23,42,0.6)',
          border: '1px solid rgba(51,65,85,0.5)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(20px)',
        }}>
          {/* Status dot */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" style={{
              boxShadow: '0 0 8px rgba(239,68,68,0.6)',
            }} />
            <span className="text-xs" style={{ color: '#64748b' }}>Secure</span>
          </div>

          {accessDenied && (
            <div className="mb-5 p-3 rounded-xl flex items-center gap-3" style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}>
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-300">غير مصرح</p>
                <p className="text-xs" style={{ color: '#94a3b8' }}>حسابك غير مخول للوصول لهذه الواجهة</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
            {/* Email */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold tracking-wide" style={{ color: '#94a3b8' }}>
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  dir="ltr"
                  className="w-full h-12 px-4 rounded-xl text-sm text-white placeholder:text-gray-600 outline-none transition-all"
                  style={{
                    background: 'rgba(30,41,59,0.5)',
                    border: '1px solid rgba(51,65,85,0.5)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(37,99,235,0.6)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(51,65,85,0.5)'}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold tracking-wide" style={{ color: '#94a3b8' }}>
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full h-12 px-4 pl-12 rounded-xl text-sm text-white placeholder:text-gray-600 outline-none transition-all"
                  style={{
                    background: 'rgba(30,41,59,0.5)',
                    border: '1px solid rgba(51,65,85,0.5)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(37,99,235,0.6)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(51,65,85,0.5)'}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                  style={{ color: '#64748b' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#94a3b8'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #6366f1)',
                boxShadow: '0 4px 15px rgba(37,99,235,0.3)',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.boxShadow = '0 6px 25px rgba(37,99,235,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(37,99,235,0.3)';
              }}
            >
              {loading ? (
                <Spinner size="sm" color="border-white" />
              ) : (
                <>
                  تسجيل الدخول
                  <Fingerprint className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: '#334155' }}>
          واجهة محجوزة للمشرفين المعتمدين فقط
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
};

export default AdminAuth;

import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  Send,
  FileText,
  Key,
  Smartphone,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Home,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

const navItems = [
  { path: '/dashboard', label: 'حملاتي', icon: Send, exact: true },
  { path: '/dashboard/sms-logs', label: 'سجل الإرسال', icon: FileText, exact: false },
  { path: '/dashboard/api-keys', label: 'مفاتيح API', icon: Key, exact: false },
  { path: '/dashboard/devices', label: 'أجهزةي', icon: Smartphone, exact: false },
  { path: '/dashboard/settings', label: 'الإعدادات', icon: Settings, exact: false },
];

export function DashboardLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string, exact: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 right-0 z-50 w-64 bg-white border-l border-gray-200
          transform transition-transform duration-200 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2">
                <Home className="w-5 h-5 text-gray-500" />
                <span className="text-lg font-bold text-primary">مرسل الهدهد</span>
              </Link>
              <button
                className="md:hidden p-1"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">لوحة تحكمي</p>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                  ${isActive(item.path, item.exact)
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {isActive(item.path, item.exact) && (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email || 'مستخدم'}
                </p>
                <p className="text-xs text-gray-500">حساب شخصي</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={signOut}
            >
              <LogOut className="w-5 h-5" />
              <span>تسجيل الخروج</span>
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 md:hidden">
          <button
            className="p-2 -mr-2"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

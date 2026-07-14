import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/components/ui/button';
import {
  LayoutDashboard, Users, MessageSquare, KeyRound, Shield,
  LogOut, Menu, X, Smartphone, BarChart3, Home, Archive, Radio,
} from 'lucide-react';

const navItems = [
  { to: '/super-admin', icon: LayoutDashboard, label: 'لوحة التحكم', end: true },
  { to: '/super-admin/users', icon: Users, label: 'المستخدمون' },
  { to: '/super-admin/campaigns', icon: MessageSquare, label: 'الحملات' },
  { to: '/super-admin/logs', icon: BarChart3, label: 'سجلات الإرسال' },
  { to: '/super-admin/sending-channels', icon: Radio, label: 'وسائط الإرسال' },
  { to: '/super-admin/api-keys', icon: KeyRound, label: 'مفاتيح API' },
  { to: '/super-admin/devices', icon: Smartphone, label: 'الأجهزة' },
  { to: '/super-admin/roles', icon: Shield, label: 'الصلاحيات' },
  { to: '/super-admin/dead-letters', icon: Archive, label: 'قائمة DLQ' },
];

export function SuperAdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 right-4 z-50 md:hidden p-2 rounded-lg bg-card border shadow-sm"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed top-0 right-0 z-40 h-full w-64 bg-card border-l border-border shadow-lg transition-transform duration-200 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Link to="/" className="p-2 hover:bg-accent rounded-lg">
                <Home className="w-4 h-4" />
              </Link>
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">لوحة المشرف</h2>
                <p className="text-xs text-muted-foreground">مرسال الهدهد</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="p-3 border-t border-border space-y-2">
            <div className="px-3 py-2 text-xs text-muted-foreground truncate">
              {user?.email}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start gap-2 text-muted-foreground"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </aside>

      <main className="md:mr-64 min-h-screen">
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

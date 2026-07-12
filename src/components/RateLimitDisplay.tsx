import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BarChart3, Clock, CalendarDays } from 'lucide-react';
import { Spinner } from '@/components/Spinner';

const RATE_LIMITS = {
  HOURLY: 5000,
  DAILY: 10000,
};

function ProgressBar({ percent }: { percent: number }) {
  const color = percent >= 90 ? 'bg-destructive' : percent >= 70 ? 'bg-yellow-500' : 'bg-primary';
  return (
    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percent}%` }} />
    </div>
  );
}

export default function RateLimitDisplay() {
  const { user } = useAuth();
  const [hourlyUsed, setHourlyUsed] = useState(0);
  const [dailyUsed, setDailyUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUsage = async () => {
      setLoading(true);
      const now = new Date();
      const hourStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0));
      const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));

      const { data } = await supabase
        .from('rate_limits')
        .select('messages_sent, window_start')
        .eq('user_id', user.id)
        .gte('window_start', dayStart.toISOString());

      if (data) {
        const hourly = data
          .filter(r => new Date(r.window_start).getTime() === hourStart.getTime())
          .reduce((sum, r) => sum + r.messages_sent, 0);
        const daily = data.reduce((sum, r) => sum + r.messages_sent, 0);
        setHourlyUsed(hourly);
        setDailyUsed(daily);
      }
      setLoading(false);
    };

    fetchUsage();
    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner size="sm" color="border-primary" />
      </div>
    );
  }

  const hourlyPercent = Math.min((hourlyUsed / RATE_LIMITS.HOURLY) * 100, 100);
  const dailyPercent = Math.min((dailyUsed / RATE_LIMITS.DAILY) * 100, 100);

  const formatNumber = (n: number) => n.toLocaleString('ar');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h4 className="font-medium text-sm">استخدام الحصة</h4>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>الرسائل / ساعة</span>
            </div>
            <span className="font-mono text-foreground">
              {formatNumber(hourlyUsed)} / {formatNumber(RATE_LIMITS.HOURLY)}
            </span>
          </div>
          <ProgressBar percent={hourlyPercent} />
          {hourlyPercent >= 100 && (
            <p className="text-xs text-destructive">تم الوصول للحد الأقصى في الساعة</p>
          )}
          {hourlyPercent > 80 && hourlyPercent < 100 && (
            <p className="text-xs text-yellow-600">أنت تقريب من الحد الأقصى في الساعة</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="w-3 h-3" />
              <span>الرسائل / يوم</span>
            </div>
            <span className="font-mono text-foreground">
              {formatNumber(dailyUsed)} / {formatNumber(RATE_LIMITS.DAILY)}
            </span>
          </div>
          <ProgressBar percent={dailyPercent} />
          {dailyPercent >= 100 && (
            <p className="text-xs text-destructive">تم الوصول للحد الأقصى يوميًا</p>
          )}
          {dailyPercent > 80 && dailyPercent < 100 && (
            <p className="text-xs text-yellow-600">أنت تقريب من الحد الأقصى يوميًا</p>
          )}
        </div>
      </div>
    </div>
  );
}

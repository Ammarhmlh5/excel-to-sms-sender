import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Link, Unlink, Smartphone, Globe, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface UserLink {
  id: string;
  external_platform: string;
  external_user_id: string;
  external_email: string | null;
  linked_via: string;
  is_verified: boolean;
  linked_at: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  hudhud: 'هدهد ويب',
  hudhud_android: 'هدهد أندرويد',
  hudhud_ios: 'هدهد iOS',
  mobile: 'هدهد موبايل',
  external: 'منصة خارجية',
};

const LINK_VIA_LABELS: Record<string, string> = {
  redirect: 'إعادة توجيه',
  device_registration: 'تسجيل جهاز',
  manual: 'يدوي',
  auth: 'مصادقة',
};

const LinkedAccounts = () => {
  const [links, setLinks] = useState<UserLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-user-links');
      if (error) throw new Error(error.message);
      setLinks(data?.links || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطأ في جلب الحسابات المرتبطة');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleUnlink = async (linkId: string, platform: string) => {
    if (!confirm(`هل أنت متأكد من فك ارتباط ${PLATFORM_LABELS[platform] || platform}؟`)) return;

    setDeleting(linkId);
    try {
      const { error } = await supabase.functions.invoke('manage-user-links', {
        body: { link_id: linkId },
        method: 'DELETE',
      });
      if (error) throw new Error(error.message);
      toast.success('تم فك الارتباط بنجاح');
      setLinks(prev => prev.filter(l => l.id !== linkId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطأ في فك الارتباط');
    } finally {
      setDeleting(null);
    }
  };

  const getPlatformIcon = (platform: string) => {
    if (platform.includes('android') || platform.includes('ios')) {
      return <Smartphone className="w-4 h-4" />;
    }
    return <Globe className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          الحسابات المرتبطة بحسابك
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchLinks}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </Button>
      </div>

      {links.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Link className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>لا توجد حسابات مرتبطة حالياً</p>
          <p className="text-xs mt-1">
            يمكنك ربط حسابك مع منصة الهدهد عبر إعادة التوجيه
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30"
            >
              <div className="flex items-center gap-3">
                {getPlatformIcon(link.external_platform)}
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={link.is_verified ? 'default' : 'secondary'}>
                      {PLATFORM_LABELS[link.external_platform] || link.external_platform}
                    </Badge>
                    {link.is_verified ? (
                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                        <CheckCircle className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <AlertCircle className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    عبر: {LINK_VIA_LABELS[link.linked_via] || link.linked_via}
                    {link.external_email && ` • ${link.external_email}`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUnlink(link.id, link.external_platform)}
                disabled={deleting === link.id}
                className="text-destructive hover:text-destructive"
              >
                {deleting === link.id ? (
                  <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Unlink className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LinkedAccounts;

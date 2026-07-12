import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Campaign {
  id: string;
  name: string;
  status: string;
  contacts_count: number;
  sent_count: number;
  failed_count: number;
  source: string | null;
  created_at: string | null;
}

export function useRealtimeCampaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, status, contacts_count, sent_count, failed_count, source, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setCampaigns(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    fetchCampaigns();

    channelRef.current = supabase
      .channel(`campaigns-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCampaigns(prev => [payload.new as Campaign, ...prev].slice(0, 20));
          } else if (payload.eventType === 'UPDATE') {
            setCampaigns(prev =>
              prev.map(c => c.id === (payload.new as Campaign).id ? (payload.new as Campaign) : c)
            );
          } else if (payload.eventType === 'DELETE') {
            setCampaigns(prev => prev.filter(c => c.id !== payload.old?.id));
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchCampaigns]);

  return { campaigns, loading, refresh: fetchCampaigns };
}

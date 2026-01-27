import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtimeSubscription<T>(
  table: string,
  filter?: string,
  callback?: (payload: any) => void
) {
  const [data, setData] = useState<T[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const channelName = `${table}_changes`;
    const newChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter,
        },
        (payload) => {
          if (callback) {
            callback(payload);
          }
        }
      )
      .subscribe();

    setChannel(newChannel);

    return () => {
      supabase.removeChannel(newChannel);
    };
  }, [table, filter, callback]);

  return { data, channel };
}

// Hook for deliveries real-time updates
export function useDeliveriesRealtime(
  date?: string,
  onUpdate?: (payload: any) => void
) {
  const filter = date ? `date=eq.${date}` : undefined;
  return useRealtimeSubscription('deliveries', filter, onUpdate);
}

// Hook for screenshots real-time updates
export function useScreenshotsRealtime(
  deliveryId?: string,
  onUpdate?: (payload: any) => void
) {
  const filter = deliveryId ? `delivery_id=eq.${deliveryId}` : undefined;
  return useRealtimeSubscription('screenshots', filter, onUpdate);
}

// Hook for reel tasks real-time updates
export function useReelTasksRealtime(
  userId?: string,
  onUpdate?: (payload: any) => void
) {
  const filter = userId ? `assigned_user_id=eq.${userId}` : undefined;
  return useRealtimeSubscription('reel_tasks', filter, onUpdate);
}

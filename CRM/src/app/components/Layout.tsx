import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { LogOut, Menu, Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface LayoutProps {
  children: React.ReactNode;
  hideHeader?: boolean;
}

export function Layout({ children, hideHeader = false }: LayoutProps) {
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Listen for nudges/notifications
    const subscription = supabase
      .channel(`user_notifications_${user.id}`)
      .on('postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotif = payload.new;

          // 1. Show Toast
          toast.info(newNotif.title, {
            description: newNotif.body,
            duration: 8000,
            icon: <Bell className="h-4 w-4 text-blue-500" />,
          });

          // 2. Browser Notification if permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotif.title, {
              body: newNotif.body,
              icon: '/favicon.ico'
            });
          }

          // 3. Play Sound (Optional, but user liked it for live bookings)
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(e => console.error('Audio play failed:', e));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - only show on home */}
      {!hideHeader && (
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Delivery Ops</h1>
              <p className="text-sm text-gray-500">{user?.name} • {user?.role}</p>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}

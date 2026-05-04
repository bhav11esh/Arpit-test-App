import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Film, BarChart3, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';

interface BottomNavProps {
  userRole: 'ADMIN' | 'PHOTOGRAPHER';
}

export function BottomNav({ userRole }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (user?.id && userRole === 'PHOTOGRAPHER') {
      const fetchCount = async () => {
        const { count, error } = await supabase
          .from('reel_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_user_id', user.id)
          .eq('status', 'PENDING')
          .eq('is_post_it', false); // Only count their own pending reels, not pool items

        if (!error && count !== null) {
          setPendingCount(count);
        }
      };

      fetchCount();

      // Realtime subscription for instant badge updates
      const channel = supabase
        .channel('nav_reel_count')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'reel_tasks',
          filter: `assigned_user_id=eq.${user.id}`
        }, () => {
          fetchCount();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, userRole]);

  // V1 SPEC: Different tabs for Admin vs Photographer
  const allTabs = [
    { id: 'home', label: 'Home', icon: Home, path: '/', photographerOnly: true },
    { id: 'reels', label: userRole === 'ADMIN' ? 'Reels' : 'Reel Backlog', icon: Film, path: '/reels', photographerOnly: false },
    { id: 'view', label: userRole === 'ADMIN' ? 'View' : 'Stats', icon: BarChart3, path: '/view', photographerOnly: false },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile', photographerOnly: false },
  ];

  // Filter tabs based on user role
  const tabs = userRole === 'ADMIN' 
    ? allTabs.filter(tab => !tab.photographerOnly)
    : allTabs;

  // Determine active tab from current path
  const currentTab = tabs.find(tab => tab.path === location.pathname)?.id || (userRole === 'ADMIN' ? 'view' : 'home');

  return (
    <nav className="fixed bottom-0 left-0 right-0 nav-glass z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className={`grid ${userRole === 'ADMIN' ? 'grid-cols-3' : 'grid-cols-4'} h-16`}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                isActive 
                  ? 'text-orange-600 nav-active-pill' 
                  : 'text-gray-400 hover:text-gray-600 active:scale-90'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {tab.id === 'reels' && pendingCount > 0 && (
                  <div className="absolute -top-1.5 -right-2 bg-orange-600 text-white text-[8px] font-black h-3.5 min-w-[14px] px-1 flex items-center justify-center rounded-full border border-white shadow-sm ring-2 ring-transparent group-active:ring-orange-200">
                    {pendingCount}
                  </div>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

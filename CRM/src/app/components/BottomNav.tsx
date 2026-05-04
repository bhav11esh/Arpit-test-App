import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Film, BarChart3, User } from 'lucide-react';

interface BottomNavProps {
  userRole: 'ADMIN' | 'PHOTOGRAPHER';
}

export function BottomNav({ userRole }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

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
                  ? 'text-indigo-600 nav-active-pill' 
                  : 'text-gray-400 hover:text-gray-600 active:scale-90'
              }`}
            >
              <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

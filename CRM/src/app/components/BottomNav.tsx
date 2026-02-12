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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className={`grid ${userRole === 'ADMIN' ? 'grid-cols-3' : 'grid-cols-4'} h-16`}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive 
                  ? 'text-[#2563EB]' 
                  : 'text-gray-500'
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

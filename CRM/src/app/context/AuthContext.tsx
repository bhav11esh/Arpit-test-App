import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { getUserByEmail } from '../lib/db/users';
import type { User } from '../types';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from users table based on auth user
  const fetchUserData = async (authUserId: string, email: string): Promise<User | null> => {
    try {
      // First try to get user by email
      let userData = await getUserByEmail(email);
      
      // If not found, try to get by auth user ID (in case email doesn't match)
      if (!userData) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUserId)
          .single();
        
        if (data) {
          userData = {
            id: data.id,
            name: data.name,
            role: data.role as 'ADMIN' | 'PHOTOGRAPHER',
            active: data.active,
            cluster_code: data.cluster_code ?? undefined,
          };
        }
      }
      
      return userData;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user.id, session.user.email || '').then(setUser);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.user) {
        const userData = await fetchUserData(session.user.id, session.user.email || '');
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const userData = await fetchUserData(data.user.id, email);
        if (!userData) {
          throw new Error('User not found in database. Please contact administrator.');
        }
        if (!userData.active) {
          await supabase.auth.signOut();
          throw new Error('Your account has been deactivated. Please contact administrator.');
        }
        setUser(userData);
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to sign in');
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<void> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Note: User creation in users table should be handled by admin or a trigger
      // For now, we'll just sign them up in auth
      if (data.user) {
        // Admin should create the user record in users table separately
        throw new Error('Account created. Please contact administrator to activate your account.');
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to sign up');
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to sign out');
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to send password reset email');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, signUp, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

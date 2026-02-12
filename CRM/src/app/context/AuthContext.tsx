import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, adminSupabase } from '../lib/supabase';
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
    // V1 FIX: increased timeout to 15s to handle database latency
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('FETCH_USER_TIMEOUT')), 15000)
    );

    try {
      // V1 FIX: Use privileged client for user fetch to bypass RLS
      const client = adminSupabase || supabase;

      const userData = await Promise.race([
        getUserByEmail(email, client),
        timeoutPromise
      ]);

      if (!userData) {
        // Fallback to ID match if email match fails (common during first login)
        const { data, error } = await client
          .from('users')
          .select('*')
          .eq('id', authUserId)
          .single();

        if (error) return null;

        if (data) {
          return {
            id: (data as any).id,
            name: (data as any).name,
            email: (data as any).email,
            role: (data as any).role as 'ADMIN' | 'PHOTOGRAPHER',
            active: (data as any).active,
            cluster_code: (data as any).cluster_code ?? undefined,
          };
        }
      }

      return userData as User | null;
    } catch (error) {
      console.error('[AuthContext] fetchUserData failed:', error);
      // V1 FIX: If timeout occurs, return undefined to signal "transient failure" 
      // instead of null (which signals "user not found")
      if (error instanceof Error && error.message === 'FETCH_USER_TIMEOUT') {
        return undefined as any;
      }
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (mounted) {
          setSession(session);
          if (session?.user) {
            const userData = await fetchUserData(session.user.id, session.user.email || '');
            if (mounted && userData !== undefined) setUser(userData);
          }
        }
      } catch (error) {
        console.error('[AuthContext] initSession failed:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      setSession(session);
      if (session?.user) {
        console.log('[Auth] Session active, fetching user data for:', session.user.email);
        const userData = await fetchUserData(session.user.id, session.user.email || '');
        if (mounted) {
          if (userData === undefined) {
            console.warn('[Auth] FETCH_TIMEOUT: Preserving existing user state');
            // Do NOT update user to null, just keep existing state
          } else if (!userData) {
            console.warn('[Auth] USER_DATA_NULL: User has session but no DB record');
            setUser(null);
          } else {
            setUser(userData);
          }
        }
      } else {
        if (mounted) {
          if (user) console.log('[Auth] SESSION_LOST: User logged out');
          setUser(null);
        }
      }

      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        const userData = await fetchUserData(data.user.id, email);
        if (!userData) throw new Error('User record missing in database.');
        setUser(userData);
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      });
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch (error) {
      throw error;
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
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

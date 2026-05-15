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

  // V1 OPTIMIZATION: Track the last fetched user ID to prevent redundant parallel calls
  const lastFetchedId = React.useRef<string | null>(null);

  // Fetch user data from users table based on auth user
  const fetchUserData = async (authUserId: string, email: string): Promise<User | null> => {
    // V1 OPTIMIZATION: Prevent parallel fetches for the same ID
    if (lastFetchedId.current === authUserId && user) {
      console.log('[AuthContext] Already fetched user data for:', authUserId);
      return user;
    }

    // V1 OPTIMIZATION: Reduced timeout to 10s. Better to show dashboard with session
    // than to hang indefinitely on a slow user record fetch.
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('FETCH_USER_TIMEOUT')), 10000)
    );

    try {
      lastFetchedId.current = authUserId;
      console.log('[AuthContext] Performing fresh fetch for:', email);

      const client = supabase;
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
            city: (data as any).city ?? undefined,
          };
        }
      }

      return userData as User | null;
    } catch (error) {
      console.error('[AuthContext] fetchUserData failed:', error);
      lastFetchedId.current = null; // Allow retry on failure

      if (error instanceof Error && error.message === 'FETCH_USER_TIMEOUT') {
        return undefined as any;
      }
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    // V1 OPTIMIZATION: Use a stable session handler
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log(`[Auth] Event: ${event}`);

      try {
        setSession(session);
        if (session?.user) {
          if (mounted) setLoading(true);
          console.log('[Auth] Session detected, fetching user data...');
          const userData = await fetchUserData(session.user.id, session.user.email || '');

          if (mounted) {
            if (userData === undefined) {
              console.warn('[Auth] FETCH_TIMEOUT: Using session metadata as fallback');
              // V1 FALLBACK: Build user from JWT user_metadata when DB is unreachable
              const meta = session.user.user_metadata || {};
              
              // CRITICAL: Prevent flickering. If we know this email is an admin, force it.
              const hardcodedAdmins = ['arpitmudgal24@gmail.com'];
              const isHardcodedAdmin = hardcodedAdmins.includes(session.user.email || '');

              const fallbackRole: 'ADMIN' | 'PHOTOGRAPHER' = isHardcodedAdmin ? 'ADMIN' : 
                ((meta.role as any) || (user?.email === session.user.email ? user.role : 'PHOTOGRAPHER'));

              const fallbackUser: User = {
                id: session.user.id,
                email: session.user.email || '',
                name: meta.name || session.user.email || 'User',
                role: fallbackRole,
                active: true,
                cluster_code: meta.cluster_code || user?.cluster_code || '',
                city: meta.city || user?.city || 'bengaluru',
              };
              setUser(fallbackUser);
              console.log('[Auth] Fallback user set:', fallbackUser.email, fallbackUser.role, fallbackUser.city, fallbackUser.cluster_code, isHardcodedAdmin ? '(Hardcoded Admin)' : '');
            } else if (!userData) {
              console.warn('[Auth] USER_DATA_NULL: User record missing');
              setUser(null);
            } else if (!userData.active) {
              console.error('[Auth] USER_INACTIVE: Account deactivated');
              // If account is inactive, we clear the user so App.tsx can handle it
              // We DON'T signOut automatically here to allow App to show a specific "Deactivated" screen
              setUser(userData); 
            } else {
              setUser(userData);
            }
          }
        } else {
          if (mounted) {
            setUser(null);
            lastFetchedId.current = null;
          }
        }
      } catch (err) {
        console.error('[Auth] State change error:', err);
      } finally {
        if (mounted) {
          console.log(`[Auth] Finalizing session update: user=${!!session?.user}, loading=false`);
          setLoading(false);
        }
      }
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
        
        if (!userData.active) {
          await supabase.auth.signOut();
          throw new Error('This account has been deactivated. Please contact an administrator.');
        }
        
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

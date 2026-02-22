import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Cluster, Dealership, Mapping, User } from '../types';
import * as configDb from '../lib/db/config';
import * as usersDb from '../lib/db/users';
import { supabase, adminSupabase } from '../lib/supabase';

/**
 * ConfigContext - V1 SYSTEM SETUP ONLY (NOT OPERATIONAL CONTROL)
 * 
 * ⚠️ CRITICAL V1 BOUNDARY ENFORCEMENT:
 * 
 * This context provides Admin-only CRUD for system configuration entities.
 * It is EXPLICITLY NOT part of execution state and MUST NOT:
 * 
 * ❌ Edit delivery objects
 * ❌ Edit delivery status
 * ❌ Edit reel backlog
 * ❌ Edit incentives
 * ❌ Edit logs
 * ❌ Affect any delivery already created
 * 
 * ✅ Configuration changes apply ONLY to:
 * - Future delivery creation
 * - Future cluster → dealership → photographer resolution
 * 
 * 🔒 ONE-WAY DEPENDENCY:
 * - Execution logic (HomeScreen, SendUpdate, ReelBacklog) can READ config
 * - Execution logic MUST NEVER mutate config
 * - Config changes are declarative environment setup, NOT runtime operations
 * 
 * 📌 IMMUTABILITY RULES:
 * - Mappings are declarative, not dynamic
 * - PRIMARY mappings do NOT reassign existing deliveries
 * - SECONDARY mappings only affect accept/reject eligibility for FUTURE deliveries
 * - Config is "editable seed data," not a governance system
 */

interface ConfigContextType {
  loading: boolean;
  // Clusters
  clusters: Cluster[];
  addCluster: (cluster: Omit<Cluster, 'id'>) => Promise<void>;
  updateCluster: (id: string, cluster: Partial<Cluster>) => Promise<void>;
  deleteCluster: (id: string) => Promise<void>;

  // Dealerships
  dealerships: Dealership[];
  addDealership: (dealership: Omit<Dealership, 'id'>) => Promise<void>;
  updateDealership: (id: string, dealership: Partial<Dealership>) => Promise<void>;
  deleteDealership: (id: string) => Promise<void>;

  // Photographers (Users with PHOTOGRAPHER role)
  photographers: User[];
  addPhotographer: (photographer: Omit<User, 'id' | 'role'> & { email: string, password?: string }) => Promise<void>;
  updatePhotographer: (id: string, photographer: Partial<User>) => Promise<void>;
  updatePhotographerPassword: (id: string, newPassword: string) => Promise<void>;
  deletePhotographer: (id: string) => Promise<void>;

  // Mappings
  mappings: Mapping[];
  addMapping: (mapping: Omit<Mapping, 'id'>) => Promise<void>;
  updateMapping: (id: string, mapping: Partial<Mapping>) => Promise<void>;
  deleteMapping: (id: string) => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [photographers, setPhotographers] = useState<User[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true); // Changed from setIsLoading to setLoading
      try {
        // V1 FIX: Use adminSupabase (Service Role) if available to bypass RLS for Admin views
        const client = adminSupabase || supabase;
        console.log('[ConfigContext] Loading data...', {
          isAdminSupabaseAvailable: !!adminSupabase,
          usingClient: adminSupabase ? 'ADMIN (Service Role)' : 'PUBLIC (Anon)'
        });

        const [clustersData, dealershipsData, photographersData, mappingsData] = await Promise.all([
          configDb.getClusters(client), // Pass client
          configDb.getDealerships(client), // Pass client
          usersDb.getUsersByRole('PHOTOGRAPHER', client), // Pass client
          configDb.getMappings(client), // Pass client
        ]);

        console.log('[ConfigContext] Data loaded:', {
          clusters: clustersData.length,
          dealerships: dealershipsData.length,
          photographers: photographersData.length,
          mappings: mappingsData.length
        });

        setClusters(clustersData);
        setDealerships(dealershipsData);
        setPhotographers(photographersData);
        setMappings(mappingsData);
      } catch (error) {
        console.error('Error loading config data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Cluster operations
  const addCluster = async (cluster: Omit<Cluster, 'id'>) => {
    try {
      const newCluster = await configDb.createCluster(cluster);
      setClusters(prev => [...prev, newCluster]);
    } catch (error) {
      console.error('Error adding cluster:', error);
      throw error;
    }
  };

  const updateCluster = async (id: string, updates: Partial<Cluster>) => {
    try {
      const updated = await configDb.updateCluster(id, updates);
      setClusters(prev => prev.map(c => (c.id === id ? updated : c)));
    } catch (error) {
      console.error('Error updating cluster:', error);
      throw error;
    }
  };

  const deleteCluster = async (id: string) => {
    try {
      await configDb.deleteCluster(id);
      setClusters(prev => prev.filter(c => c.id !== id));
      // Also delete related mappings
      setMappings(prev => prev.filter(m => m.clusterId !== id));
    } catch (error) {
      console.error('Error deleting cluster:', error);
      throw error;
    }
  };

  // Dealership operations
  const addDealership = async (dealership: Omit<Dealership, 'id'>) => {
    try {
      const newDealership = await configDb.createDealership(dealership);
      setDealerships(prev => [...prev, newDealership]);
    } catch (error) {
      console.error('Error adding dealership:', error);
      throw error;
    }
  };

  const updateDealership = async (id: string, updates: Partial<Dealership>) => {
    try {
      const updated = await configDb.updateDealership(id, updates);
      setDealerships(prev => prev.map(d => (d.id === id ? updated : d)));
    } catch (error) {
      console.error('Error updating dealership:', error);
      throw error;
    }
  };

  const deleteDealership = async (id: string) => {
    try {
      await configDb.deleteDealership(id);
      setDealerships(prev => prev.filter(d => d.id !== id));
      // Also delete related mappings
      setMappings(prev => prev.filter(m => m.dealershipId !== id));
    } catch (error) {
      console.error('Error deleting dealership:', error);
      throw error;
    }
  };

  // Photographer operations
  const addPhotographer = async (photographer: Omit<User, 'id' | 'role'> & { email: string, password?: string }) => {
    try {
      // V1 FIX: Check if user already exists in DB first to handle reactivation
      const existingUser = await usersDb.getUserByEmail(photographer.email);

      if (existingUser) {
        if (existingUser.active) {
          throw new Error(`A user with email ${photographer.email} already exists and is active.`);
        }

        // SMART REACTIVATION FLOW
        console.log('[ConfigContext] Reactivating photographer:', photographer.email);

        if (!adminSupabase) {
          throw new Error('Admin Service Role key is missing. Cannot reactivate photographer.');
        }

        // Recreate Auth account with the SAME ID to maintain links to history
        const { error: authError } = await adminSupabase.auth.admin.createUser({
          id: existingUser.id,
          email: photographer.email,
          password: photographer.password,
          email_confirm: true,
          user_metadata: {
            name: photographer.name,
            role: 'PHOTOGRAPHER'
          }
        });

        if (authError) {
          console.error('[ConfigContext] Auth reactivation failed:', authError);
          throw authError;
        }

        // Update DB record to active
        const updated = await usersDb.updateUser(existingUser.id, {
          name: photographer.name,
          active: true,
          phone_number: photographer.phone_number
        });

        setPhotographers(prev => [...prev, updated]);
        return;
      }

      // V1 FIX: Use privileged admin client to create Auth account
      if (!adminSupabase) {
        throw new Error('Admin Service Role key is missing. Cannot create photographer.');
      }

      console.log('[ConfigContext] Creating Auth account for:', photographer.email);
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: photographer.email,
        password: photographer.password,
        email_confirm: true,
        user_metadata: {
          name: photographer.name,
          role: 'PHOTOGRAPHER'
        }
      });

      if (authError) {
        console.error('[ConfigContext] Auth creation failed:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Auth creation returned no user data.');
      }

      console.log('[ConfigContext] Auth account created successfully with ID:', authData.user.id);

      // Create the DB record with MATCHING ID
      const newPhotographer = await usersDb.createUserWithId({
        name: photographer.name,
        email: photographer.email,
        role: 'PHOTOGRAPHER',
        active: photographer.active,
        phone_number: photographer.phone_number,
      });

      setPhotographers(prev => [...prev, newPhotographer]);
    } catch (error) {
      console.error('Error adding photographer:', error);
      throw error;
    }
  };

  const updatePhotographer = async (id: string, updates: Partial<User>) => {
    try {
      const updated = await usersDb.updateUser(id, updates);
      setPhotographers(prev => prev.map(p => (p.id === id ? updated : p)));
    } catch (error) {
      console.error('Error updating photographer:', error);
      throw error;
    }
  };

  const updatePhotographerPassword = async (id: string, newPassword: string) => {
    try {
      // V1 CRITICAL: Use the privileged admin client
      if (!adminSupabase) {
        throw new Error('Admin Service Role key is missing. Cannot update password.');
      }

      // Find the photographer to get their email and name
      const photographer = photographers.find(p => p.id === id);
      if (!photographer) {
        throw new Error('Photographer record not found in database.');
      }

      console.log(`[ConfigContext] Attempting to update password for: ${photographer.email} (${id})`);

      // 1. Try to update an EXISTING Auth account
      const { error: updateError } = await adminSupabase.auth.admin.updateUserById(id, {
        password: newPassword
      });

      // 2. If the user doesn't exist in Auth, CREATE it
      if (updateError) {
        const isNotFoundError =
          (updateError as any).status === 404 ||
          updateError.message?.toLowerCase().includes('not found') ||
          (updateError as any).code === 'not_found';

        if (isNotFoundError) {
          console.log('[ConfigContext] Auth account missing by ID. Checking for email conflict:', photographer.email);

          // V1 SYNCHRONIZATION: Check if user exists with DIFFERENT ID
          // This fixes the "User already registered" error and restores DB integrity
          const { data: { users: existingUsers }, error: listError } = await adminSupabase.auth.admin.listUsers();

          if (listError) {
            console.error('[ConfigContext] Failed to list users for sync:', listError);
            throw listError;
          }

          const interferingUser = existingUsers.find(u => u.email?.toLowerCase() === photographer.email.toLowerCase());

          if (interferingUser) {
            console.log(`[ConfigContext] FOUND SPLIT BRAIN: Auth ID (${interferingUser.id}) != DB ID (${id}). Syncing...`);

            // DELETE the conflicting Auth user
            const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(interferingUser.id);
            if (deleteError) {
              console.error('[ConfigContext] Failed to delete conflicting user:', deleteError);
              throw deleteError;
            }
            console.log('[ConfigContext] Deleted conflicting Auth user.');
          } else {
            console.log('[ConfigContext] No conflicting user found. Creating fresh.');
          }

          // CREATE new Auth user with CORRECT ID (restoring link)
          const { error: createError } = await adminSupabase.auth.admin.createUser({
            id: id,
            email: photographer.email,
            password: newPassword,
            email_confirm: true,
            user_metadata: {
              name: photographer.name,
              role: 'PHOTOGRAPHER'
            }
          });

          if (createError) {
            console.error('[ConfigContext] Auth creation failed:', createError);
            throw createError;
          }

          console.log('[ConfigContext] Auth account created and linked successfully with ID:', id);
          return;
        }

        console.error('[ConfigContext] Password update failed with unexpected error:', updateError);
        throw updateError;
      }
    } catch (error) {
      console.error('Error updating photographer password:', error);
      throw error;
    }
  };

  const deletePhotographer = async (id: string) => {
    try {
      // V1 FIX: Remove from Supabase Auth so the email can be reused/re-added later
      if (adminSupabase) {
        console.log('[ConfigContext] Deleting Auth account for:', id);
        const { error: authError } = await adminSupabase.auth.admin.deleteUser(id);
        if (authError) {
          // Warning only, as the user might not even exist in Auth (desynced)
          console.warn('[ConfigContext] Auth deletion warning:', authError);
        }
      }

      // Soft-delete in DB to preserve historical delivery logs
      await usersDb.deleteUser(id);

      setPhotographers(prev => prev.filter(p => p.id !== id));
      // Also delete related mappings
      setMappings(prev => prev.filter(m => m.photographerId !== id));
    } catch (error) {
      console.error('Error deleting photographer:', error);
      throw error;
    }
  };

  // Mapping operations
  const addMapping = async (mapping: Omit<Mapping, 'id'>) => {
    try {
      const newMapping = await configDb.createMapping(mapping);
      setMappings(prev => [...prev, newMapping]);
    } catch (error) {
      console.error('Error adding mapping:', error);
      throw error;
    }
  };

  const updateMapping = async (id: string, updates: Partial<Mapping>) => {
    try {
      const updated = await configDb.updateMapping(id, updates);
      setMappings(prev => prev.map(m => (m.id === id ? updated : m)));
    } catch (error) {
      console.error('Error updating mapping:', error);
      throw error;
    }
  };

  const deleteMapping = async (id: string) => {
    try {
      await configDb.deleteMapping(id);
      setMappings(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Error deleting mapping:', error);
      throw error;
    }
  };

  return (
    <ConfigContext.Provider
      value={{
        loading,
        clusters,
        addCluster,
        updateCluster,
        deleteCluster,
        dealerships,
        addDealership,
        updateDealership,
        deleteDealership,
        photographers,
        addPhotographer,
        updatePhotographer,
        updatePhotographerPassword,
        deletePhotographer,
        mappings,
        addMapping,
        updateMapping,
        deleteMapping,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}

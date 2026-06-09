import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { User, UserRole } from '../../types';
import type { Database } from '../types/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];
type UserUpdate = Database['public']['Tables']['users']['Update'];

// Convert database row to app type
const rowToUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role as UserRole,
  active: row.active,
  phone_number: row.phone_number,
  cluster_code: row.cluster_code ?? undefined,
  last_active: row.last_active ?? undefined,
  last_gps_status: row.last_gps_status as any ?? 'UNKNOWN',
  city: row.city ?? undefined,
});

// Get all users
export const getUsers = async (supabaseClient: SupabaseClient<Database> = supabase): Promise<User[]> => {
  const { data, error } = await (supabaseClient
    .from('users') as any)
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data.map(rowToUser);
};

// Get active users only
export const getActiveUsers = async (): Promise<User[]> => {
  const { data, error } = await (supabase
    .from('users') as any)
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data.map(rowToUser);
};

// Get users by role
export const getUsersByRole = async (role: UserRole, supabaseClient: SupabaseClient<Database> = supabase): Promise<User[]> => {
  const { data, error } = await (supabaseClient
    .from('users') as any)
    .select('*')
    .eq('role', role)
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data.map(rowToUser);
};

// Get a single user by ID
export const getUserById = async (id: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<User | null> => {
  const { data, error } = await (supabaseClient
    .from('users') as any)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return rowToUser(data);
};

// Get user by email
export const getUserByEmail = async (email: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<User | null> => {
  const { data, error } = await (supabaseClient
    .from('users') as any)
    .select('*')
    .eq('email', email)
    .limit(1);

  if (error) throw error;

  if (!data || data.length === 0) return null;
  return rowToUser(data[0]);
};

// Create a new user
export const createUser = async (user: Omit<User, 'id'> & { email: string }): Promise<User> => {
  const insert: UserInsert = {
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active ?? true,
    phone_number: user.phone_number ?? null,
    cluster_code: user.cluster_code ?? null,
    city: (user as any).city ?? null,
  };

  const { data, error } = await (supabase
    .from('users') as any)
    .insert(insert as any)
    .select()
    .single();

  if (error) throw error;
  return rowToUser(data);
};

// Create a new user with manual ID (used for Auth sync)
export const createUserWithId = async (user: User): Promise<User> => {
  const insert: UserInsert = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active ?? true,
    phone_number: user.phone_number ?? null,
    cluster_code: user.cluster_code ?? null,
    city: (user as any).city ?? null,
  };

  const { data, error } = await (supabase
    .from('users') as any)
    .insert(insert as any)
    .select()
    .single();

  if (error) throw error;
  return rowToUser(data);
};

// Update a user
export const updateUser = async (id: string, updates: Partial<User> & { email?: string }): Promise<User> => {
  const update: UserUpdate = {
    email: updates.email,
    name: updates.name,
    role: updates.role,
    active: updates.active,
    phone_number: updates.phone_number,
    cluster_code: updates.cluster_code ?? null,
    last_active: updates.last_active,
    last_gps_status: updates.last_gps_status,
    city: (updates as any).city,
  };

  // Remove undefined values
  Object.keys(update).forEach(key => {
    if (update[key as keyof UserUpdate] === undefined) {
      delete update[key as keyof UserUpdate];
    }
  });

  const { data, error } = await (supabase
    .from('users') as any)
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return rowToUser(data);
};

// Delete a user (soft delete by deactivating)
export const deleteUser = async (id: string): Promise<void> => {
  const { error } = await (supabase
    .from('users') as any)
    .update({ active: false })
    .eq('id', id);

  if (error) throw error;
};

// Activate a user
export const activateUser = async (id: string): Promise<void> => {
  const { error } = await (supabase
    .from('users') as any)
    .update({ active: true })
    .eq('id', id);

  if (error) throw error;
};

// Get active users in a specific cluster
export const getActiveUsersByCluster = async (clusterCode: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<User[]> => {
  const { data, error } = await (supabaseClient
    .from('users') as any)
    .select('*')
    .eq('active', true)
    .eq('cluster_code', clusterCode);

  if (error) throw error;
  return data.map(rowToUser);
};

// Admin only: Update user password
export const adminUpdateUserPassword = async (userId: string, newPassword: string): Promise<void> => {
  const { adminSupabase } = await import('../supabase');
  if (!adminSupabase) {
    throw new Error('Admin privileges required for this operation. Service role key not configured.');
  }

  const { error } = await adminSupabase.auth.admin.updateUserById(userId, {
    password: newPassword
  });

  if (error) throw error;
};

// Update user's heartbeat (Last Active) and GPS status
export const updateUserMonitoring = async (
  userId: string,
  gpsStatus: 'ON' | 'OFF' | 'UNKNOWN',
  supabaseClient: SupabaseClient<Database> = supabase
): Promise<void> => {
  try {
    const { error } = await (supabaseClient
      .from('users') as any)
      .update({
        last_active: new Date().toISOString(),
        last_gps_status: gpsStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  } catch (err) {
    console.error('Heartbeat update failed:', err);
  }
};

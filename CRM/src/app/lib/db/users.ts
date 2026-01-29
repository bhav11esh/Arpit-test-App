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
  role: row.role as UserRole,
  active: row.active,
  cluster_code: row.cluster_code ?? undefined,
});

// Get all users
export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data.map(rowToUser);
};

// Get active users only
export const getActiveUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data.map(rowToUser);
};

// Get users by role
export const getUsersByRole = async (role: UserRole): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', role)
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data.map(rowToUser);
};

// Get a single user by ID
export const getUserById = async (id: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
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
export const getUserByEmail = async (email: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return rowToUser(data);
};

// Create a new user
export const createUser = async (user: Omit<User, 'id'> & { email: string }): Promise<User> => {
  const insert: UserInsert = {
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active ?? true,
    cluster_code: user.cluster_code ?? null,
  };

  const { data, error } = await supabase
    .from('users')
    .insert(insert)
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
    cluster_code: updates.cluster_code ?? null,
  };

  // Remove undefined values
  Object.keys(update).forEach(key => {
    if (update[key as keyof UserUpdate] === undefined) {
      delete update[key as keyof UserUpdate];
    }
  });

  const { data, error } = await supabase
    .from('users')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return rowToUser(data);
};

// Delete a user (soft delete by deactivating)
export const deleteUser = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .update({ active: false })
    .eq('id', id);

  if (error) throw error;
};

// Activate a user
export const activateUser = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .update({ active: true })
    .eq('id', id);

  if (error) throw error;
};

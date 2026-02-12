import { SupabaseClient } from '@supabase/supabase-js';
import { supabase, adminSupabase } from '../supabase';
import type { Cluster, Dealership, Mapping, MappingType } from '../../types';
import type { Database } from '../types/database.types';

type ClusterRow = Database['public']['Tables']['clusters']['Row'];
type ClusterInsert = Database['public']['Tables']['clusters']['Insert'];
type ClusterUpdate = Database['public']['Tables']['clusters']['Update'];

type DealershipRow = Database['public']['Tables']['dealerships']['Row'];
type DealershipInsert = Database['public']['Tables']['dealerships']['Insert'];
type DealershipUpdate = Database['public']['Tables']['dealerships']['Update'];

type MappingRow = Database['public']['Tables']['mappings']['Row'];
type MappingInsert = Database['public']['Tables']['mappings']['Insert'];
type MappingUpdate = Database['public']['Tables']['mappings']['Update'];

// Cluster functions
const rowToCluster = (row: ClusterRow): Cluster => ({
  id: row.id,
  name: row.name,
});

export const getClusters = async (supabaseClient: SupabaseClient<Database> = supabase): Promise<Cluster[]> => {
  const { data, error } = await supabaseClient
    .from('clusters')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data.map(rowToCluster);
};

export const getClusterById = async (id: string): Promise<Cluster | null> => {
  const { data, error } = await supabase
    .from('clusters')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return rowToCluster(data);
};

export const createCluster = async (cluster: Omit<Cluster, 'id'>): Promise<Cluster> => {
  const insert: ClusterInsert = {
    name: cluster.name,
    latitude: 0,
    longitude: 0,
  };

  const client = adminSupabase || supabase;
  const { data, error } = await client
    .from('clusters')
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return rowToCluster(data);
};

export const updateCluster = async (id: string, updates: Partial<Cluster>): Promise<Cluster> => {
  const update: ClusterUpdate = {
    name: updates.name,
    latitude: 0,
    longitude: 0,
  };

  Object.keys(update).forEach(key => {
    if (update[key as keyof ClusterUpdate] === undefined) {
      delete update[key as keyof ClusterUpdate];
    }
  });

  const client = adminSupabase || supabase;
  const { data, error } = await client
    .from('clusters')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return rowToCluster(data);
};

export const deleteCluster = async (id: string): Promise<void> => {
  const client = adminSupabase || supabase;
  const { error } = await client
    .from('clusters')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Dealership functions
const rowToDealership = (row: DealershipRow): Dealership => ({
  id: row.id,
  name: row.name,
  paymentType: row.payment_type,
  googleSheetId: row.google_sheet_id,
});

export const getDealerships = async (supabaseClient: SupabaseClient<Database> = supabase): Promise<Dealership[]> => {
  const { data, error } = await supabaseClient
    .from('dealerships')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data.map(rowToDealership);
};

export const getDealershipById = async (id: string): Promise<Dealership | null> => {
  const { data, error } = await supabase
    .from('dealerships')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return rowToDealership(data);
};

export const createDealership = async (dealership: Omit<Dealership, 'id'>): Promise<Dealership> => {
  const insert: DealershipInsert = {
    name: dealership.name,
    payment_type: dealership.paymentType,
    google_sheet_id: dealership.googleSheetId,
    latitude: 0,
    longitude: 0,
  };

  const client = adminSupabase || supabase;
  const { data, error } = await client
    .from('dealerships')
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return rowToDealership(data);
};

export const updateDealership = async (id: string, updates: Partial<Dealership>): Promise<Dealership> => {
  const update: DealershipUpdate = {
    name: updates.name,
    payment_type: updates.paymentType,
    google_sheet_id: updates.googleSheetId,
    latitude: 0,
    longitude: 0,
  };

  Object.keys(update).forEach(key => {
    if (update[key as keyof DealershipUpdate] === undefined) {
      delete update[key as keyof DealershipUpdate];
    }
  });

  const client = adminSupabase || supabase;
  const { data, error } = await client
    .from('dealerships')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return rowToDealership(data);
};

export const deleteDealership = async (id: string): Promise<void> => {
  const client = adminSupabase || supabase;
  const { error } = await client
    .from('dealerships')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Mapping functions
const rowToMapping = (row: MappingRow): Mapping => ({
  id: row.id,
  clusterId: row.cluster_id,
  dealershipId: row.dealership_id,
  photographerId: row.photographer_id,
  mappingType: row.mapping_type as MappingType,
  latitude: row.latitude ?? 0,
  longitude: row.longitude ?? 0,
});

export const getMappings = async (supabaseClient: SupabaseClient<Database> = supabase): Promise<Mapping[]> => {
  const { data, error } = await supabaseClient
    .from('mappings')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(rowToMapping);
};

export const getMappingsByCluster = async (clusterId: string): Promise<Mapping[]> => {
  const { data, error } = await supabase
    .from('mappings')
    .select('*')
    .eq('cluster_id', clusterId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(rowToMapping);
};

export const getMappingsByPhotographer = async (photographerId: string): Promise<Mapping[]> => {
  const { data, error } = await supabase
    .from('mappings')
    .select('*')
    .eq('photographer_id', photographerId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(rowToMapping);
};

export const getMappingById = async (id: string): Promise<Mapping | null> => {
  const { data, error } = await supabase
    .from('mappings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return rowToMapping(data);
};

export const createMapping = async (mapping: Omit<Mapping, 'id'>): Promise<Mapping> => {
  const insert: MappingInsert = {
    cluster_id: mapping.clusterId,
    dealership_id: mapping.dealershipId,
    photographer_id: mapping.photographerId,
    mapping_type: mapping.mappingType,
    latitude: mapping.latitude,
    longitude: mapping.longitude,
  };

  const client = adminSupabase || supabase;
  const { data, error } = await client
    .from('mappings')
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return rowToMapping(data);
};

export const updateMapping = async (id: string, updates: Partial<Mapping>): Promise<Mapping> => {
  const update: MappingUpdate = {
    cluster_id: updates.clusterId,
    dealership_id: updates.dealershipId,
    photographer_id: updates.photographerId,
    mapping_type: updates.mappingType,
    latitude: updates.latitude,
    longitude: updates.longitude,
  };

  Object.keys(update).forEach(key => {
    if (update[key as keyof MappingUpdate] === undefined) {
      delete update[key as keyof MappingUpdate];
    }
  });

  const client = adminSupabase || supabase;
  const { data, error } = await client
    .from('mappings')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return rowToMapping(data);
};

export const deleteMapping = async (id: string): Promise<void> => {
  const client = adminSupabase || supabase;
  const { error } = await client
    .from('mappings')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

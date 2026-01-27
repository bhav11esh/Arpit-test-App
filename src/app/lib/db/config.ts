import { supabase } from '../supabase';
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
  latitude: row.latitude,
  longitude: row.longitude,
});

export const getClusters = async (): Promise<Cluster[]> => {
  const { data, error } = await supabase
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
    latitude: cluster.latitude,
    longitude: cluster.longitude,
  };

  const { data, error } = await supabase
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
    latitude: updates.latitude,
    longitude: updates.longitude,
  };

  Object.keys(update).forEach(key => {
    if (update[key as keyof ClusterUpdate] === undefined) {
      delete update[key as keyof ClusterUpdate];
    }
  });

  const { data, error } = await supabase
    .from('clusters')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return rowToCluster(data);
};

export const deleteCluster = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('clusters')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Dealership functions
const rowToDealership = (row: DealershipRow): Dealership => ({
  id: row.id,
  name: row.name,
  latitude: row.latitude,
  longitude: row.longitude,
  paymentType: row.payment_type,
});

export const getDealerships = async (): Promise<Dealership[]> => {
  const { data, error } = await supabase
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
    latitude: dealership.latitude,
    longitude: dealership.longitude,
    payment_type: dealership.paymentType,
  };

  const { data, error } = await supabase
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
    latitude: updates.latitude,
    longitude: updates.longitude,
    payment_type: updates.paymentType,
  };

  Object.keys(update).forEach(key => {
    if (update[key as keyof DealershipUpdate] === undefined) {
      delete update[key as keyof DealershipUpdate];
    }
  });

  const { data, error } = await supabase
    .from('dealerships')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return rowToDealership(data);
};

export const deleteDealership = async (id: string): Promise<void> => {
  const { error } = await supabase
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
});

export const getMappings = async (): Promise<Mapping[]> => {
  const { data, error } = await supabase
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
  };

  const { data, error } = await supabase
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
  };

  Object.keys(update).forEach(key => {
    if (update[key as keyof MappingUpdate] === undefined) {
      delete update[key as keyof MappingUpdate];
    }
  });

  const { data, error } = await supabase
    .from('mappings')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return rowToMapping(data);
};

export const deleteMapping = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('mappings')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

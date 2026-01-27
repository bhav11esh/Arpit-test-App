import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Cluster, Dealership, Mapping, User } from '../types';
import * as configDb from '../lib/db/config';
import * as usersDb from '../lib/db/users';

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
  addPhotographer: (photographer: Omit<User, 'id' | 'role'> & { email: string }) => Promise<void>;
  updatePhotographer: (id: string, photographer: Partial<User>) => Promise<void>;
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
      try {
        const [clustersData, dealershipsData, photographersData, mappingsData] = await Promise.all([
          configDb.getClusters(),
          configDb.getDealerships(),
          usersDb.getUsersByRole('PHOTOGRAPHER'),
          configDb.getMappings(),
        ]);

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
  const addPhotographer = async (photographer: Omit<User, 'id' | 'role'> & { email: string }) => {
    try {
      const newPhotographer = await usersDb.createUser({
        ...photographer,
        role: 'PHOTOGRAPHER',
        email: photographer.email,
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

  const deletePhotographer = async (id: string) => {
    try {
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
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Leave, LeaveHalf, LeaveAppliedBy } from '../types';
import * as leavesDb from '../lib/db/leaves';

interface LeaveContextType {
  leaves: Leave[];
  loading: boolean;
  addLeave: (photographerId: string, date: string, half: LeaveHalf, appliedBy: LeaveAppliedBy) => Promise<void>;
  removeLeave: (leaveId: string) => Promise<void>;
  getLeavesByPhotographer: (photographerId: string) => Leave[];
  getLeavesByDate: (date: string) => Leave[];
  isPhotographerOnLeave: (photographerId: string, date: string, half: LeaveHalf) => boolean;
  isFullDayLeave: (photographerId: string, date: string) => boolean;
  refreshLeaves: () => Promise<void>;
}

const LeaveContext = createContext<LeaveContextType | undefined>(undefined);

export function LeaveProvider({ children }: { children: React.ReactNode }) {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);

  // Load leaves from Supabase
  const loadLeaves = async () => {
    try {
      setLoading(true);
      const allLeaves = await leavesDb.getAllLeaves();
      setLeaves(allLeaves);
    } catch (error) {
      console.error('Error loading leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const addLeave = async (photographerId: string, date: string, half: LeaveHalf, appliedBy: LeaveAppliedBy) => {
    try {
      // Check if leave already exists
      const isOnLeave = await leavesDb.isPhotographerOnLeave(photographerId, date, half);
      if (isOnLeave) {
        throw new Error('Leave already exists for this photographer, date, and half');
      }

      const newLeave = await leavesDb.createLeave({
        photographerId,
        date,
        half,
        appliedBy,
      });

      setLeaves(prev => [...prev, newLeave]);
    } catch (error) {
      console.error('Error adding leave:', error);
      throw error;
    }
  };

  const removeLeave = async (leaveId: string) => {
    try {
      await leavesDb.deleteLeave(leaveId);
      setLeaves(prev => prev.filter(leave => leave.id !== leaveId));
    } catch (error) {
      console.error('Error removing leave:', error);
      throw error;
    }
  };

  const getLeavesByPhotographer = (photographerId: string) => {
    return leaves
      .filter(leave => leave.photographerId === photographerId)
      .sort((a, b) => {
        // Sort by date DESC, then by half (FIRST_HALF before SECOND_HALF)
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return a.half === 'FIRST_HALF' ? -1 : 1;
      });
  };

  const getLeavesByDate = (date: string) => {
    return leaves
      .filter(leave => leave.date === date)
      .sort((a, b) => a.photographerId.localeCompare(b.photographerId));
  };

  const isPhotographerOnLeave = (photographerId: string, date: string, half: LeaveHalf) => {
    return leaves.some(
      leave =>
        leave.photographerId === photographerId &&
        leave.date === date &&
        leave.half === half
    );
  };

  const isFullDayLeave = (photographerId: string, date: string) => {
    const firstHalfExists = leaves.some(
      leave =>
        leave.photographerId === photographerId &&
        leave.date === date &&
        leave.half === 'FIRST_HALF'
    );
    const secondHalfExists = leaves.some(
      leave =>
        leave.photographerId === photographerId &&
        leave.date === date &&
        leave.half === 'SECOND_HALF'
    );
    return firstHalfExists && secondHalfExists;
  };

  return (
    <LeaveContext.Provider
      value={{
        leaves,
        loading,
        addLeave,
        removeLeave,
        getLeavesByPhotographer,
        getLeavesByDate,
        isPhotographerOnLeave,
        isFullDayLeave,
        refreshLeaves: loadLeaves,
      }}
    >
      {children}
    </LeaveContext.Provider>
  );
}

export function useLeave() {
  const context = useContext(LeaveContext);
  if (!context) {
    throw new Error('useLeave must be used within LeaveProvider');
  }
  return context;
}

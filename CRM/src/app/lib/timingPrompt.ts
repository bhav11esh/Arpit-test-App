import { SupabaseClient } from '@supabase/supabase-js';
import { getLogEvents } from './db/logs';
import type { Delivery, Mapping } from '../types';
import type { Database } from './types/database.types';
import { getLocalDateString, getOperationalDateString } from './utils';
import { supabase } from './supabase';

/**
 * TimingPromptState - V1 SPEC: Tracks hourly timing prompt state per showroom
 */
export interface ShowroomPromptState {
  showroomCode: string;
  date: string; // YYYY-MM-DD
  lastPromptTime: number; // timestamp
  nextPromptTime: number; // timestamp
  isDismissed: boolean;
  isFinalized: boolean; // All deliveries have timing or explicitly deferred
}

// Mock storage for timing prompt state (for session-level snooze)
const timingPromptStates: Map<string, ShowroomPromptState> = new Map();

/**
 * Get unique key for showroom+date combination
 */
function getPromptKey(showroomCode: string, date: string): string {
  return `${showroomCode}_${date}`;
}

/**
 * Get current hour
 */
function getCurrentHour(): number {
  return new Date().getHours();
}

/**
 * Check if current time is >= 9:00 AM
 */
function isAfter9AM(): boolean {
  return getCurrentHour() >= 9;
}

/**
 * Calculate next prompt time (1 hour from last prompt)
 */
function calculateNextPromptTime(lastPromptTime: number): number {
  return lastPromptTime + (60 * 60 * 1000); // 1 hour in milliseconds
}

/**
 * Initialize prompt state for a showroom+date
 */
export function initializePromptState(
  showroomCode: string,
  date: string
): ShowroomPromptState {
  const key = getPromptKey(showroomCode, date);

  if (!timingPromptStates.has(key)) {
    const now = Date.now();
    const state: ShowroomPromptState = {
      showroomCode,
      date,
      lastPromptTime: now,
      nextPromptTime: calculateNextPromptTime(now),
      isDismissed: false,
      isFinalized: false,
    };
    timingPromptStates.set(key, state);
    return state;
  }

  return timingPromptStates.get(key)!;
}

/**
 * V1 CRITICAL: Check if a showroom was finalized by ANYONE in the cluster today.
 * This ensures "Global Showroom Finalization" for secondary showrooms.
 */
async function isShowroomFinalizedGlobally(showroomCode: string, date: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<boolean> {
  // We use the date part of the created_at timestamp in log_events
  try {
    const logs = await getLogEvents({
      type: 'SHOWROOM_FINALIZED',
      targetId: showroomCode,
      startDate: `${date}T00:00:00Z`,
      endDate: `${date}T23:59:59Z`
    }, supabaseClient);

    return logs.length > 0;
  } catch (error) {
    console.error('Error checking global finalization:', error);
    return false;
  }
}

/**
 * Check if a showroom should show timing prompt now
 */
export async function shouldShowTimingPrompt(
  showroomCode: string,
  date: string,
  deliveries: Delivery[],
  supabaseClient: SupabaseClient<Database> = supabase
): Promise<boolean> {
  // 1. Time boundary check
  if (!isAfter9AM()) {
    return false;
  }

  // 2. Global DB-level Finalization Check
  const isGloballyFinalized = await isShowroomFinalizedGlobally(showroomCode, date, supabaseClient);
  if (isGloballyFinalized) {
    return false;
  }

  // 3. Local Finalization / Dismissal Check
  const key = getPromptKey(showroomCode, date);
  const state = timingPromptStates.get(key);

  // If finalized locally (persists across refreshes), never show again
  if (state?.isFinalized || isShowroomFinalizedLocally(showroomCode, date)) {
    return false;
  }

  // 5. Snooze logic
  // Only check snooze if we haven't already returned false
  if (state) {
    // Check if enough time has passed since last prompt
    const now = Date.now();
    if (now < state.nextPromptTime) {
      return false;
    }
  }

  // V1 FINAL: If we got here, it's not finalized and not snoozed.
  return true;
}

/**
 * Mark prompt as dismissed for this cycle
 */
export function dismissPrompt(showroomCode: string, date: string): void {
  const key = getPromptKey(showroomCode, date);
  const state = timingPromptStates.get(key);

  if (state) {
    state.isDismissed = true;
    state.lastPromptTime = Date.now();
    state.nextPromptTime = calculateNextPromptTime(state.lastPromptTime);
  } else {
    const now = Date.now();
    timingPromptStates.set(key, {
      showroomCode,
      date,
      lastPromptTime: now,
      nextPromptTime: calculateNextPromptTime(now),
      isDismissed: true,
      isFinalized: false,
    });
  }
}

/**
 * Mark showroom+date as finalized (all deliveries have timing)
 */
export function finalizeShowroom(showroomCode: string, date: string): void {
  const key = getPromptKey(showroomCode, date);
  const state = timingPromptStates.get(key);

  if (state) {
    state.isFinalized = true;
  } else {
    const now = Date.now();
    timingPromptStates.set(key, {
      showroomCode,
      date,
      lastPromptTime: now,
      nextPromptTime: calculateNextPromptTime(now),
      isDismissed: false,
      isFinalized: true,
    });
  }

  // Persist to localStorage for immediate refresh resistance
  if (typeof window !== 'undefined') {
    localStorage.setItem(`finalized_${showroomCode}_${date}`, 'true');
  }
}

/**
 * Check if showroom was finalized locally (persisted)
 */
export function isShowroomFinalizedLocally(showroomCode: string, date: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(`finalized_${showroomCode}_${date}`) === 'true';
}

export function areAllDeliveriesFinalized(deliveries: Delivery[]): boolean {
  if (deliveries.length === 0) return false;
  return deliveries.every(d => d.timing !== null);
}

export function getShowroomsNeedingTimingInput(
  photographerId: string,
  clusterCode: string,
  mappings: Array<any>,
  deliveries: Delivery[]
): string[] {
  // This function might need to be async now that shouldShowTimingPrompt is async
  // But for V1, we usually trigger this from an effect which handles the async part.
  // Actually, getShowroomsNeedingTimingInput is called synchronously in some places.
  // Let's mark it as async to be safe.
  return []; // We will handle actual logic in HomeScreen effect
}

export function getNextCreationIndex(showroomCode: string, date: string, deliveries: Delivery[]): number {
  const existingDeliveries = deliveries.filter(
    d => d.showroom_code === showroomCode && d.date === date
  );
  if (existingDeliveries.length === 0) return 1;
  const maxIndex = existingDeliveries.reduce((max, d) => Math.max(max, d.creation_index || 0), 0);
  return maxIndex + 1;
}

export function markEndOfDay(photographerId: string, servicedCount: number): void {
  const today = getOperationalDateString();
  const key = `CRM_EOD_${photographerId}_${today}`;
  const data = { closed: true, servicedCount, timestamp: Date.now() };
  localStorage.setItem(key, JSON.stringify(data));
}

export function hasEndedDay(photographerId: string): boolean {
  if (!photographerId) return false;
  const today = getOperationalDateString();
  const key = `CRM_EOD_${photographerId}_${today}`;
  const stored = localStorage.getItem(key);
  if (!stored) return false;
  try {
    const data = JSON.parse(stored);
    return data.closed === true;
  } catch (e) {
    return false;
  }
}

export function resetEndOfDayStates(photographerId: string): void {
  const today = getOperationalDateString();
  const key = `CRM_EOD_${photographerId}_${today}`;
  localStorage.removeItem(key);
}



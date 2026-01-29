import type { Delivery } from '../types';

/**
 * TimingPromptState - V1 SPEC: Tracks hourly timing prompt state per showroom
 * 
 * 🔄 CORE LOGIC:
 * - Prompts start at 9:00 AM
 * - Repeat every 1 hour
 * - Stop when all deliveries for that showroom are finalized
 * 
 * 🛑 FINALIZED = All deliveries have timing OR explicitly deferred
 * 
 * This state persists across navigation and page refreshes (mock localStorage)
 */

export interface ShowroomPromptState {
  showroomCode: string;
  date: string; // YYYY-MM-DD
  lastPromptTime: number; // timestamp
  nextPromptTime: number; // timestamp
  isDismissed: boolean;
  isFinalized: boolean; // All deliveries have timing or explicitly deferred
}

// Mock storage for timing prompt state
const timingPromptStates: Map<string, ShowroomPromptState> = new Map();

/**
 * Get unique key for showroom+date combination
 */
function getPromptKey(showroomCode: string, date: string): string {
  return `${showroomCode}_${date}`;
}

/**
 * Get current hour (9:00 AM = 9, 2:30 PM = 14, etc.)
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
 * Check if a showroom should show timing prompt now
 * 
 * Returns true if:
 * - Current time >= 9:00 AM
 * - Current time >= nextPromptTime
 * - Showroom is not finalized
 * - Has at least one delivery without timing OR no deliveries yet
 */
export function shouldShowTimingPrompt(
  showroomCode: string,
  date: string,
  deliveries: Delivery[]
): boolean {
  // Must be after 9:00 AM
  if (!isAfter9AM()) {
    return false;
  }

  const key = getPromptKey(showroomCode, date);
  const state = timingPromptStates.get(key);

  // If finalized, never show again for this showroom+date
  if (state?.isFinalized) {
    return false;
  }

  // Check if all deliveries have timing (finalized)
  const allHaveTiming = deliveries.length > 0 && deliveries.every(d => d.timing !== null);
  if (allHaveTiming) {
    // Mark as finalized
    if (state) {
      state.isFinalized = true;
    }
    return false;
  }

  // If no state yet, this is first time - show prompt
  if (!state) {
    return true;
  }

  // Check if enough time has passed since last prompt
  const now = Date.now();
  if (now >= state.nextPromptTime) {
    return true;
  }

  return false;
}

/**
 * Mark prompt as dismissed for this cycle
 * It will show again after 1 hour
 */
export function dismissPrompt(showroomCode: string, date: string): void {
  const key = getPromptKey(showroomCode, date);
  const state = timingPromptStates.get(key);
  
  if (state) {
    state.isDismissed = true;
    state.lastPromptTime = Date.now();
    state.nextPromptTime = calculateNextPromptTime(state.lastPromptTime);
  } else {
    // Initialize with dismissed state
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
 * No more prompts will be shown
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
}

/**
 * Check if all deliveries for a showroom are finalized (have timing)
 */
export function areAllDeliveriesFinalized(deliveries: Delivery[]): boolean {
  if (deliveries.length === 0) {
    return false; // No deliveries yet = not finalized
  }
  
  return deliveries.every(d => d.timing !== null);
}

/**
 * Get all showrooms that should show timing prompt for a photographer
 * 
 * @param photographerId - Current photographer
 * @param clusterCode - Photographer's cluster
 * @param mappings - All showroom mappings
 * @param deliveries - All deliveries for today
 * @returns Array of showroom codes that need timing input
 */
export function getShowroomsNeedingTimingInput(
  photographerId: string,
  clusterCode: string,
  mappings: Array<{ showroomCode: string; clusterId: string; photographerId: string; mappingType: 'PRIMARY' | 'SECONDARY' }>,
  deliveries: Delivery[]
): string[] {
  const today = new Date().toISOString().split('T')[0];
  
  // Get all showrooms assigned to this photographer (PRIMARY) or in their cluster (SECONDARY eligible)
  const eligibleShowrooms = mappings.filter(m => {
    // PRIMARY: directly assigned to photographer
    if (m.mappingType === 'PRIMARY' && m.photographerId === photographerId) {
      return true;
    }
    
    // SECONDARY: any photographer in same cluster can handle
    if (m.mappingType === 'SECONDARY' && m.clusterId === clusterCode) {
      return true;
    }
    
    return false;
  });

  // Filter to showrooms that need timing input
  const showroomsNeedingInput: string[] = [];
  
  for (const showroom of eligibleShowrooms) {
    const showroomDeliveries = deliveries.filter(
      d => d.showroom_code === showroom.showroomCode && d.date === today
    );
    
    if (shouldShowTimingPrompt(showroom.showroomCode, today, showroomDeliveries)) {
      showroomsNeedingInput.push(showroom.showroomCode);
    }
  }
  
  return showroomsNeedingInput;
}

/**
 * Reset all prompt states (for testing/debugging)
 */
export function resetAllPromptStates(): void {
  timingPromptStates.clear();
}

/**
 * Get next delivery creation index for a showroom+date
 * Used for incremental naming: _1, _2, _3, etc.
 */
export function getNextCreationIndex(showroomCode: string, date: string, deliveries: Delivery[]): number {
  const existingDeliveries = deliveries.filter(
    d => d.showroom_code === showroomCode && d.date === date
  );
  
  if (existingDeliveries.length === 0) {
    return 1;
  }
  
  // Find highest creation_index
  const maxIndex = existingDeliveries.reduce((max, d) => {
    return Math.max(max, d.creation_index || 0);
  }, 0);
  
  return maxIndex + 1;
}

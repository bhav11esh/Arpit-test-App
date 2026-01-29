import type { Delivery } from '../types';

/**
 * V1 SPEC: Check if delivery prompt has expired (current time >= delivery time)
 */
export function isPromptExpired(
  delivery: { timing: string | null; date: string },
  currentTime: Date = new Date()
): boolean {
  if (!delivery.timing) return false;

  const [year, month, day] = delivery.date.split('-').map(Number);
  const [hours, minutes] = delivery.timing.split(':').map(Number);
  
  const deliveryTime = new Date(year, month - 1, day, hours, minutes);

  return currentTime >= deliveryTime;
}

/**
 * V1 CRITICAL: Centralized self-assign eligibility check
 * A photographer may self-assign a delivery ONLY if ALL conditions are true:
 * - status === REJECTED (photographer-rejected, not by customer)
 * - NOT REJECTED_CUSTOMER
 * - NOT CANCELLED
 * - NOT POSTPONED
 * - Photographer has NOT clicked SEND UPDATE (photographerDayState === 'ACTIVE')
 * 
 * @param delivery - The delivery to check
 * @param photographerDayState - Current photographer's day state ('ACTIVE' | 'CLOSED')
 * @returns true if photographer can self-assign this delivery
 */
export function canSelfAssign(
  delivery: Delivery,
  photographerDayState: 'ACTIVE' | 'CLOSED'
): boolean {
  // V1 RULE: Self-assign ONLY for photographer-rejected deliveries
  if (delivery.status !== 'REJECTED') {
    return false;
  }

  // V1 RULE: Cannot self-assign terminal states
  if (
    delivery.status === 'REJECTED_CUSTOMER' ||
    delivery.status === 'CANCELED' ||
    delivery.status === 'POSTPONED'
  ) {
    return false;
  }

  // V1 RULE: Cannot self-assign if photographer already closed their day
  if (photographerDayState === 'CLOSED') {
    return false;
  }

  return true;
}

/**
 * V1 SPEC: Generate delivery name based on date, showroom code, timing, and creation index
 * 
 * CRITICAL - Naming Rules (Identity Suffixes, NOT Ordering):
 * - _1/_2/_3 suffixes are PERMANENT IDENTITY MARKERS for each delivery instance
 * - These suffixes are assigned at delivery creation and NEVER change
 * - When timing is added, the _X suffix is replaced by _HH_MM format
 * - There is NO concept of reordering deliveries based on timing
 * - Multiple unknown-timing deliveries for same showroom/date get _1, _2, _3 to distinguish them
 * 
 * Examples:
 *   Creation (no timing):
 *     First delivery → 10-10-2026_KHTR_WH_1
 *     Second delivery → 10-10-2026_KHTR_WH_2
 *     Third delivery → 10-10-2026_KHTR_WH_3
 * 
 *   After timing added:
 *     10-10-2026_KHTR_WH_1 + timing 12:00 → 10-10-2026_KHTR_WH_12_00
 *     10-10-2026_KHTR_WH_2 + timing 17:00 → 10-10-2026_KHTR_WH_17_00
 * 
 *   ❌ WRONG: Do NOT renumber _2 to _1 even if its timing is earlier
 *   ✅ CORRECT: Each delivery's _X identity is permanent until timing is specified
 * 
 * When timing is present: DD-MM-YYYY_SHOWROOMCODE_HH_MM
 * When no timing: DD-MM-YYYY_SHOWROOMCODE_X (where X = creation_index)
 */
export function generateDeliveryName(
  date: string,
  showroomCode: string,
  timing?: string | null,
  creationIndex?: number
): string {
  const [year, month, day] = date.split('-');
  
  if (timing) {
    // Timing exists: use full format with time (replaces identity suffix _1/_2/_3)
    const [hours, minutes] = timing.split(':');
    return `${day}-${month}-${year}_${showroomCode}_${hours}_${minutes}`;
  } else {
    // No timing: use incremental suffix based on creation_index
    if (creationIndex !== undefined) {
      return `${day}-${month}-${year}_${showroomCode}_${creationIndex}`;
    }
    // Fallback for backward compatibility (should not happen in V1)
    return `${day}-${month}-${year}_${showroomCode}`;
  }
}

/**
 * Check if a single delivery can be sent in the update
 * V1 SPEC:
 * - Footage link: mandatory for ALL deliveries
 * - Payment screenshot: mandatory ONLY for CUSTOMER_PAID
 * - Follow screenshot: optional, never blocks
 */
export function canSendUpdate(
  delivery: Delivery,
  screenshots: any[]
): boolean {
  // V1 SPEC: Footage link mandatory for all
  if (!delivery.footage_link) {
    return false;
  }

  // V1 SPEC: Payment screenshot mandatory for customer-paid only
  if (delivery.payment_type === 'CUSTOMER_PAID') {
    const hasPaymentScreenshot = screenshots.some(
      s => s.type === 'PAYMENT' && !s.deleted_at
    );
    if (!hasPaymentScreenshot) {
      return false;
    }
  }

  // V1 SPEC: Follow screenshot is optional - never blocks
  return true;
}

/**
 * Calculate incentive eligibility
 * ₹2000 if >= 20 deliveries over 7 consecutive calendar days
 * Leave days (0 deliveries) do NOT break the streak
 */
export function calculateIncentive(
  deliveries: Delivery[],
  userId: string,
  startDate: string,
  endDate: string
): { eligible: boolean; count: number; days: number } {
  const userCompletedDeliveries = deliveries.filter(
    d => d.assigned_user_id === userId && d.status === 'DONE'
  );

  // Check if deliveries span at least 7 consecutive calendar days
  const dateRange = getDateRange(startDate, endDate);
  
  // Spec: 7 consecutive calendar days with >= 20 total deliveries
  // Leave days (0 deliveries) do NOT break streak
  const totalDays = dateRange.length;
  const totalCount = userCompletedDeliveries.length;
  
  const eligible = totalCount >= 20 && totalDays >= 7;

  return {
    eligible,
    count: totalCount,
    days: totalDays,
  };
}

/**
 * Get array of dates between start and end (inclusive)
 */
function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);

  for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }

  return dates;
}

/**
 * Format timing for display
 */
export function formatTiming(timing: string | null): string {
  if (!timing) return 'No timing set';
  return timing;
}

/**
 * Get status badge color
 * V1 SPEC: Differentiate REJECTED (operational, reversible) from REJECTED_CUSTOMER (final)
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'UNASSIGNED':
      return 'bg-yellow-100 text-yellow-800';
    case 'ASSIGNED':
      return 'bg-blue-100 text-blue-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    case 'POSTPONED_CANCELED':
      return 'bg-orange-100 text-orange-800';
    case 'DONE':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * V1 SPEC: Check if delivery should show Accept/Reject prompt
 * Prompt appears when:
 * - delivery has a timing
 * - current time is within [delivery_time - 30min, delivery_time)
 * - delivery is unassigned
 * - photographer is in same cluster
 */
export function shouldShowAcceptRejectPrompt(
  delivery: { timing: string | null; status: string; date: string; cluster_code: string },
  userClusterCode: string,
  currentTime: Date = new Date()
): boolean {
  if (!delivery.timing) return false;
  if (delivery.status !== 'UNASSIGNED') return false;
  if (delivery.cluster_code !== userClusterCode) return false;

  // Parse delivery date and timing
  const [year, month, day] = delivery.date.split('-').map(Number);
  const [hours, minutes] = delivery.timing.split(':').map(Number);
  
  const deliveryTime = new Date(year, month - 1, day, hours, minutes);
  const thirtyMinsBefore = new Date(deliveryTime.getTime() - 30 * 60 * 1000);

  // Check if current time is in [T-30, T)
  return currentTime >= thirtyMinsBefore && currentTime < deliveryTime;
}
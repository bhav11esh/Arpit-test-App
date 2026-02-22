import type { Delivery } from '../types';

/**
 * Get current date as YYYY-MM-DD string in local timezone
 */
export function getLocalDateString(date: Date = new Date()): string {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
}

/**
 * Get the "operational date" string.
 * V1 RULE: Operational day shifts at 8 AM local time.
 * Before 8 AM, we are still on the previous calendar day's operational shift.
 */
export function getOperationalDateString(now: Date = new Date()): string {
  const currentHour = now.getHours();

  if (currentHour < 8) {
    // It's before 8 AM, so the operational date is still "yesterday"
    const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    return getLocalDateString(yesterday);
  }

  // It's 8 AM or later, use the actual local date
  return getLocalDateString(now);
}

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
 * When timing is present: DD-MM-YYYY_SHOWROOMCODE_CLUSTERSHORT_HH_MM
 * When no timing: DD-MM-YYYY_SHOWROOMCODE_CLUSTERSHORT_X (where X = creation_index)
 */
export function generateDeliveryName(
  date: string,
  showroomCode: string,
  clusterShortCode: string,
  timing?: string | null,
  creationIndex?: number
): string {
  const [year, month, day] = date.split('-');

  if (timing) {
    // Timing exists: use full format with time (replaces identity suffix _1/_2/_3)
    // V1 SPEC STRICT: Zero-pad hours and minutes (e.g. 9:5 -> 09_05)
    const [hours, minutes] = timing.split(':');
    const pad = (n: string) => n.padStart(2, '0');
    return `${day}-${month}-${year}_${showroomCode}_${clusterShortCode}_${pad(hours)}_${pad(minutes)}`;
  } else {
    // No timing: use incremental suffix based on creation_index
    // V1 SPEC: Always append index for non-timed deliveries for uniqueness
    // Format: DD-MM-YYYY_SHOWROOM_CLUSTER_INDEX
    const index = creationIndex || 1;
    return `${day}-${month}-${year}_${showroomCode}_${clusterShortCode}_${index}`;
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

/**
 * V1 SPEC: Generate Short Code for Cluster (e.g., Nelamangala -> NE, Whitefield Indiranagar -> WH_IN)
 * Used for delivery naming convention.
 */
export function getClusterShortCode(clusterName: string): string {
  if (!clusterName) return 'XX';

  const words = clusterName.trim().split(/\s+/);

  if (words.length === 1) {
    // Single word: First 2 chars uppercase
    return words[0].substring(0, 2).toUpperCase();
  } else {
    // Multiple words: First 2 chars of each word, joined by _
    return words.map(w => w.substring(0, 2).toUpperCase()).join('_');
  }
}
/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

/**
 * Send a browser push notification
 */
export function sendPushNotification(title: string, options?: NotificationOptions): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  try {
    new Notification(title, options);
  } catch (err) {
    console.error('Failed to send push notification:', err);
  }
}

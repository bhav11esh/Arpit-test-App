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
 * V1 RULE: Operational day shifts at 4 AM local time.
 * Before 4 AM, we are still on the previous calendar day's operational shift.
 */
export function getOperationalDateString(now: Date = new Date()): string {
  const currentHour = now.getHours();

  if (currentHour < 4) {
    // It's before 4 AM, so the operational date is still "yesterday"
    const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    return getLocalDateString(yesterday);
  }

  // It's 4 AM or later, use the actual local date
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
 */
export function canSelfAssign(
  delivery: Delivery,
  photographerDayState: 'ACTIVE' | 'CLOSED'
): boolean {
  if (delivery.status !== 'REJECTED') return false;
  if (photographerDayState === 'CLOSED') return false;
  return true;
}

/**
 * V1 SPEC: Generate delivery name
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
    const [hours, minutes] = timing.split(':');
    const pad = (n: string) => n.padStart(2, '0');
    return `${day}-${month}-${year}_${showroomCode}_${clusterShortCode}_${pad(hours)}_${pad(minutes)}`;
  } else {
    const index = creationIndex || 1;
    return `${day}-${month}-${year}_${showroomCode}_${clusterShortCode}_${index}`;
  }
}

/**
 * Check if a single delivery can be sent in the update
 */
export function canSendUpdate(
  delivery: Delivery,
  screenshots: any[]
): boolean {
  if (!delivery.footage_link) return false;
  if (delivery.payment_type === 'CUSTOMER_PAID') {
    const hasPaymentScreenshot = screenshots.some(s => s.type === 'PAYMENT' && !s.deleted_at);
    if (!hasPaymentScreenshot) return false;
  }
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

  const dateRange = getDateRange(startDate, endDate);
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

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
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
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'UNASSIGNED': return 'bg-yellow-100 text-yellow-800';
    case 'ASSIGNED': return 'bg-blue-100 text-blue-800';
    case 'REJECTED': return 'bg-red-100 text-red-800';
    case 'REJECTED_CUSTOMER': return 'bg-red-200 text-red-900 font-bold';
    case 'POSTPONED_CANCELED': return 'bg-orange-100 text-orange-800';
    case 'DONE': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

/**
 * V1 SPEC: Check if delivery should show Accept/Reject prompt
 */
export function shouldShowAcceptRejectPrompt(
  delivery: { timing: string | null; status: string; date: string; cluster_code: string },
  userClusterCode: string,
  currentTime: Date = new Date()
): boolean {
  if (!delivery.timing) return false;
  if (delivery.status !== 'UNASSIGNED') return false;
  if (delivery.cluster_code !== userClusterCode) return false;

  const [year, month, day] = delivery.date.split('-').map(Number);
  const [hours, minutes] = delivery.timing.split(':').map(Number);

  const deliveryTime = new Date(year, month - 1, day, hours, minutes);
  const thirtyMinsBefore = new Date(deliveryTime.getTime() - 30 * 60 * 1000);

  return currentTime >= thirtyMinsBefore && currentTime < deliveryTime;
}

/**
 * V1 SPEC: Short Code for Cluster
 */
export function getClusterShortCode(clusterName: string): string {
  if (!clusterName) return 'XX';
  const words = clusterName.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return words.map(w => w.substring(0, 2).toUpperCase()).join('_');
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

/**
 * Send a browser push notification
 */
export function sendPushNotification(title: string, options?: NotificationOptions): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, options);
  } catch (err) {
    console.error('Failed to send push notification:', err);
  }
}

/**
 * V5.2 FIX: Convert Base64 VAPID key to Uint8Array for browser compatibility
 */
export const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * V5.1 FIX: Format YYYY-MM-DD to DD/MM/YYYY for Google Sheets compatibility
 */
export function formatDateForSheet(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) return dateStr;
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * V5.0 SIGNATURE LOGIC: Generate a hidden fingerprint for a delivery row
 * V5.2 CORRECTED: Match GAS Script v6.0 exactly.
 */
export function getDeliverySignature(delivery: any, photographerName: string = ''): string {
  const parts = [
    formatDateForSheet(delivery.date || '').trim(),
    String(delivery.footage_link || '').trim(),
    String((delivery as any).reel_link || '').trim(), // REEL BEFORE PHOTOGRAPHER
    String(photographerName).trim(),
    String(delivery.received_amount || '').trim(),
    String(delivery.customer_phone || '').trim(),
    String(delivery.rapido_charge || '').trim()
  ];
  return parts.join('|').toLowerCase();
}

/**
 * V1 SPEC: Standardized Showroom Code generator
 * Extract (CODE) from "Name (CODE)" or sanitize name to UPPER_SNAKE_CASE
 */
export function getShowroomCode(dealershipName: string): string {
  if (!dealershipName) return 'UNKNOWN';
  
  // 1. Try to extract code from brackets: "Nandi Toyota (NANDI_TOYOTA)" -> "NANDI_TOYOTA"
  const matches = dealershipName.match(/\(([^)]+)\)/);
  if (matches && matches[1]) return matches[1].toUpperCase();

  // 2. Fallback: Sanitize name to UPPER_SNAKE_CASE
  return dealershipName.toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * V18.0 EMERGENCY LEAVE LOGIC:
 * Check if a leave was applied less than 24 hours before the shift start.
 * Shifts: FIRST_HALF (10:00 AM), SECOND_HALF (2:00 PM).
 */
export function isEmergencyLeave(date: string, half: 'FIRST_HALF' | 'SECOND_HALF', appliedAt: string): boolean {
  if (!appliedAt) return false;

  const [year, month, day] = date.split('-').map(Number);
  const hour = half === 'FIRST_HALF' ? 10 : 14;

  // Shift start time in local timezone (since date/half are local concepts)
  const shiftStart = new Date(year, month - 1, day, hour, 0, 0);

  // Deadline is exactly 24 hours before shift start
  const deadline = new Date(shiftStart.getTime() - 24 * 60 * 60 * 1000);

  const appliedDate = new Date(appliedAt);

  return appliedDate > deadline;
}

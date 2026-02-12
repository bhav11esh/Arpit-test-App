import type { LogEvent } from '../types';
import { getLocalDateString } from './utils';

// In-memory log storage (in real app, this would be backend)
let logs: LogEvent[] = [];

export type LogEventType =
  | 'DELIVERY_ACCEPTED'
  | 'DELIVERY_REJECTED'
  | 'DELIVERY_ASSIGNED'
  | 'DELIVERY_UNASSIGNED'
  | 'TIMING_UPDATED'
  | 'FOOTAGE_LINK_ADDED'
  | 'FOOTAGE_LINK_UPDATED'
  | 'SCREENSHOT_UPLOADED'
  | 'SCREENSHOT_DELETED'
  | 'REEL_TASK_RESOLVED'
  | 'REEL_TASK_REASSIGNED'
  | 'GEOFENCE_BREACH'
  | 'SEND_UPDATE_COMPLETED'
  | 'DELIVERY_STATUS_CHANGED'
  | 'SHOWROOM_FINALIZED';

/**
 * Create an immutable log event
 */
export function createLogEvent(
  type: LogEventType,
  actorUserId: string,
  targetId: string,
  metadata: Record<string, any> = {}
): LogEvent {
  const logEvent: LogEvent = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    actor_user_id: actorUserId,
    target_id: targetId,
    metadata,
    created_at: new Date().toISOString(),
  };

  logs.push(logEvent);

  // In real app, would send to backend
  console.log('[LOG EVENT]', logEvent);

  return logEvent;
}

/**
 * Get all log events
 * Logs are immutable - cannot be modified after creation
 */
export function getAllLogs(): LogEvent[] {
  return [...logs]; // Return copy to prevent external modification
}

/**
 * Get logs filtered by various criteria
 */
export function getLogsByFilter(filters: {
  type?: LogEventType;
  actorUserId?: string;
  targetId?: string;
  startDate?: string;
  endDate?: string;
}): LogEvent[] {
  let filtered = [...logs];

  if (filters.type) {
    filtered = filtered.filter(log => log.type === filters.type);
  }

  if (filters.actorUserId) {
    filtered = filtered.filter(log => log.actor_user_id === filters.actorUserId);
  }

  if (filters.targetId) {
    filtered = filtered.filter(log => log.target_id === filters.targetId);
  }

  if (filters.startDate) {
    filtered = filtered.filter(log => log.created_at >= filters.startDate!);
  }

  if (filters.endDate) {
    filtered = filtered.filter(log => log.created_at <= filters.endDate!);
  }

  return filtered;
}

/**
 * Clear all logs (admin only - equivalent to deleting report file in spec)
 */
export function clearAllLogs(): void {
  logs = [];
  console.log('[LOG] All logs cleared');
}

/**
 * Export logs as CSV
 */
export function exportLogsAsCSV(): string {
  const headers = ['ID', 'Type', 'Actor User ID', 'Target ID', 'Metadata', 'Created At'];
  const rows = logs.map(log => [
    log.id,
    log.type,
    log.actor_user_id,
    log.target_id,
    JSON.stringify(log.metadata),
    log.created_at,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Download logs as CSV file
 */
export function downloadLogsAsCSV(): void {
  const csv = exportLogsAsCSV();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `delivery_logs_${getLocalDateString()}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

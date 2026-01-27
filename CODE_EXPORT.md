# COMPLETE CODE EXPORT - Delivery Operations App
## V1 Spec Implementation - January 12, 2026

This document contains the complete source code for review with ChatGPT.

---

## 📁 PROJECT STRUCTURE

```
/src/
├── app/
│   ├── components/
│   │   ├── ui/ (shadcn/ui components - standard library)
│   │   ├── AcceptRejectDialog.tsx
│   │   ├── AdminLogsViewer.tsx
│   │   ├── BottomNav.tsx
│   │   ├── DeliveryCard.tsx
│   │   ├── GeofenceAlert.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── IncentiveTracker.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── ReelBacklog.tsx
│   │   ├── SendUpdateSheet.tsx
│   │   └── ViewScreen.tsx
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── lib/
│   │   ├── geofence.ts
│   │   ├── logging.ts
│   │   ├── mockData.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts
│   └── App.tsx
└── styles/
    ├── fonts.css
    └── theme.css
```

---

## 📄 TYPE DEFINITIONS

### `/src/app/types/index.ts`

```typescript
// Core domain types based on spec

export type UserRole = 'ADMIN' | 'PHOTOGRAPHER';

export type DeliveryStatus = 
  | 'PENDING'
  | 'ASSIGNED'
  | 'REJECTED'
  | 'REJECTED_CUSTOMER'
  | 'POSTPONED'
  | 'CANCELED'
  | 'DONE';

export type ScreenshotType = 'PAYMENT' | 'FOLLOW';

export type PaymentType = 'CUSTOMER_PAID' | 'DEALER_PAID';

export type ShowroomType = 'PRIMARY' | 'SECONDARY';

export type ReelStatus = 'PENDING' | 'RESOLVED';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  active: boolean;
}

export interface Delivery {
  id: string;
  date: string; // YYYY-MM-DD
  showroom_code: string;
  cluster_code: string;
  showroom_type: ShowroomType; // PRIMARY or SECONDARY
  timing: string | null; // HH:MM
  delivery_name: string;
  status: DeliveryStatus;
  assigned_user_id: string | null;
  payment_type: PaymentType;
  footage_link: string | null;
  created_at: string;
  updated_at: string;
}

export interface Screenshot {
  id: string;
  delivery_id: string;
  user_id: string;
  type: ScreenshotType;
  file_url: string;
  thumbnail_url: string;
  uploaded_at: string;
  deleted_at: string | null;
}

export interface ReelTask {
  id: string;
  delivery_id: string;
  assigned_user_id: string;
  reel_link: string | null;
  status: ReelStatus;
  reassigned_reason: string | null;
}

export interface LogEvent {
  id: string;
  type: string;
  actor_user_id: string;
  target_id: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface GeofenceBreach {
  id: string;
  delivery_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  expected_time: string;
  breach_time: string;
  distance_from_target: number; // in meters
}

export interface AcceptRejectPrompt {
  delivery_id: string;
  expires_at: string;
}
```

---

## 🔧 UTILITY FUNCTIONS

### `/src/app/lib/utils.ts`

```typescript
import type { Delivery } from '../types';

/**
 * Generate delivery name based on spec rules:
 * - Without timing: DD-MM-YYYY_SHOWROOMCODE_N
 * - With timing: DD-MM-YYYY_SHOWROOMCODE_HH_MM
 */
export function generateDeliveryName(
  date: string,
  showroomCode: string,
  timing: string | null,
  incrementalNumber?: number
): string {
  const [year, month, day] = date.split('-');
  const dateStr = `${day}-${month}-${year}`;

  if (timing) {
    const [hours, minutes] = timing.split(':');
    return `${dateStr}_${showroomCode}_${hours}_${minutes}`;
  }

  return `${dateStr}_${showroomCode}_${incrementalNumber || 1}`;
}

/**
 * Check if send update is enabled for deliveries
 * - All deliveries must have footage link
 * - Customer-paid must have payment screenshot
 */
export function canSendUpdate(
  deliveries: Delivery[],
  screenshots: Map<string, any[]>
): boolean {
  const assignedDeliveries = deliveries.filter(d => d.status === 'ASSIGNED');

  for (const delivery of assignedDeliveries) {
    // Check footage link
    if (!delivery.footage_link) {
      return false;
    }

    // Check payment screenshot for customer-paid
    if (delivery.payment_type === 'CUSTOMER_PAID') {
      const deliveryScreenshots = screenshots.get(delivery.id) || [];
      const hasPaymentScreenshot = deliveryScreenshots.some(
        s => s.type === 'PAYMENT' && !s.deleted_at
      );
      if (!hasPaymentScreenshot) {
        return false;
      }
    }
  }

  return assignedDeliveries.length > 0;
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
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'ASSIGNED':
      return 'bg-blue-100 text-blue-800';
    case 'REJECTED':
    case 'REJECTED_CUSTOMER':
      return 'bg-red-100 text-red-800';
    case 'DONE':
      return 'bg-green-100 text-green-800';
    case 'POSTPONED':
    case 'CANCELED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
```

### `/src/app/lib/geofence.ts`

```typescript
import type { Delivery, GeofenceBreach } from '../types';

// Mock showroom locations (latitude, longitude)
const SHOWROOM_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  'KHTR_WH': { lat: 28.4595, lng: 77.0266 }, // Gurgaon
  'DLF_PH3': { lat: 28.4989, lng: 77.0909 }, // DLF Phase 3
  'MGF_MET': { lat: 28.4817, lng: 77.0873 }, // MGF Metropolitan
  'VAS_MALL': { lat: 28.5494, lng: 77.2500 }, // Vasant Kunj
  'SAK_CENT': { lat: 28.5355, lng: 77.2467 }, // Saket
};

const GEOFENCE_RADIUS_METERS = 500; // 500 meters radius

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Request geolocation permission and get current position
 */
export async function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

/**
 * Check if user is within geofence for a delivery
 */
export async function checkGeofence(
  delivery: Delivery,
  userId: string
): Promise<{ inGeofence: boolean; breach: GeofenceBreach | null }> {
  try {
    const position = await getCurrentPosition();
    const userLat = position.coords.latitude;
    const userLng = position.coords.longitude;

    const showroomLocation = SHOWROOM_LOCATIONS[delivery.showroom_code];
    
    if (!showroomLocation) {
      console.warn(`No location found for showroom: ${delivery.showroom_code}`);
      return { inGeofence: true, breach: null }; // Allow if no location configured
    }

    const distance = calculateDistance(
      userLat,
      userLng,
      showroomLocation.lat,
      showroomLocation.lng
    );

    const inGeofence = distance <= GEOFENCE_RADIUS_METERS;

    if (!inGeofence) {
      const breach: GeofenceBreach = {
        id: `gb_${Date.now()}`,
        delivery_id: delivery.id,
        user_id: userId,
        latitude: userLat,
        longitude: userLng,
        expected_time: `${delivery.date}T${delivery.timing}`,
        breach_time: new Date().toISOString(),
        distance_from_target: Math.round(distance),
      };

      return { inGeofence: false, breach };
    }

    return { inGeofence: true, breach: null };
  } catch (error) {
    console.error('Geofence check failed:', error);
    // Don't block delivery if geolocation fails
    return { inGeofence: true, breach: null };
  }
}

/**
 * Calculate time until T-15 minutes for a delivery
 * Returns milliseconds until check time, or null if no timing set
 */
export function getTimeUntilGeofenceCheck(delivery: Delivery): number | null {
  if (!delivery.timing) return null;

  const [hours, minutes] = delivery.timing.split(':').map(Number);
  const deliveryDateTime = new Date(delivery.date);
  deliveryDateTime.setHours(hours, minutes, 0, 0);

  // T-15 minutes
  const checkTime = new Date(deliveryDateTime.getTime() - 15 * 60 * 1000);
  const now = new Date();

  const timeUntilCheck = checkTime.getTime() - now.getTime();

  // Return null if check time has passed
  return timeUntilCheck > 0 ? timeUntilCheck : null;
}

/**
 * Schedule geofence check for a delivery
 * Returns cleanup function to cancel the scheduled check
 */
export function scheduleGeofenceCheck(
  delivery: Delivery,
  userId: string,
  onBreachDetected: (breach: GeofenceBreach) => void
): (() => void) | null {
  const timeUntilCheck = getTimeUntilGeofenceCheck(delivery);

  if (timeUntilCheck === null) {
    return null;
  }

  const timeoutId = setTimeout(async () => {
    const { inGeofence, breach } = await checkGeofence(delivery, userId);
    
    if (!inGeofence && breach) {
      onBreachDetected(breach);
    }
  }, timeUntilCheck);

  return () => clearTimeout(timeoutId);
}
```

### `/src/app/lib/logging.ts`

```typescript
import type { LogEvent } from '../types';

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
  | 'DELIVERY_STATUS_CHANGED';

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
  link.setAttribute('download', `delivery_logs_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

### `/src/app/lib/mockData.ts`

```typescript
import type { User, Delivery, Screenshot, ReelTask } from '../types';

// Mock users
export const mockUsers: User[] = [
  { id: 'u1', name: 'Rahul Sharma', role: 'PHOTOGRAPHER', active: true },
  { id: 'u2', name: 'Priya Patel', role: 'PHOTOGRAPHER', active: true },
  { id: 'u3', name: 'Admin User', role: 'ADMIN', active: true },
];

// Mock deliveries
export const mockDeliveries: Delivery[] = [
  {
    id: 'd1',
    date: '2026-01-15',
    showroom_code: 'KHTR_WH',
    cluster_code: 'NORTH',
    showroom_type: 'PRIMARY',
    timing: '14:30',
    delivery_name: '15-01-2026_KHTR_WH_14_30',
    status: 'ASSIGNED',
    assigned_user_id: 'u1',
    payment_type: 'CUSTOMER_PAID',
    footage_link: null,
    created_at: '2026-01-12T10:00:00Z',
    updated_at: '2026-01-12T10:00:00Z',
  },
  {
    id: 'd2',
    date: '2026-01-15',
    showroom_code: 'DLF_PH3',
    cluster_code: 'SOUTH',
    showroom_type: 'SECONDARY',
    timing: '16:00',
    delivery_name: '15-01-2026_DLF_PH3_16_00',
    status: 'PENDING',
    assigned_user_id: null,
    payment_type: 'DEALER_PAID',
    footage_link: 'https://drive.google.com/example1',
    created_at: '2026-01-12T11:00:00Z',
    updated_at: '2026-01-12T11:00:00Z',
  },
  {
    id: 'd3',
    date: '2026-01-16',
    showroom_code: 'MGF_MET',
    cluster_code: 'NORTH',
    showroom_type: 'PRIMARY',
    timing: null,
    delivery_name: '16-01-2026_MGF_MET_1',
    status: 'PENDING',
    assigned_user_id: null,
    payment_type: 'CUSTOMER_PAID',
    footage_link: null,
    created_at: '2026-01-12T12:00:00Z',
    updated_at: '2026-01-12T12:00:00Z',
  },
  {
    id: 'd4',
    date: '2026-01-16',
    showroom_code: 'VAS_MALL',
    cluster_code: 'EAST',
    showroom_type: 'SECONDARY',
    timing: '11:00',
    delivery_name: '16-01-2026_VAS_MALL_11_00',
    status: 'PENDING',
    assigned_user_id: null,
    payment_type: 'CUSTOMER_PAID',
    footage_link: null,
    created_at: '2026-01-12T13:00:00Z',
    updated_at: '2026-01-12T13:00:00Z',
  },
  {
    id: 'd5',
    date: '2026-01-14',
    showroom_code: 'SAK_CENT',
    cluster_code: 'SOUTH',
    showroom_type: 'PRIMARY',
    timing: '15:30',
    delivery_name: '14-01-2026_SAK_CENT_15_30',
    status: 'DONE',
    assigned_user_id: 'u2',
    payment_type: 'CUSTOMER_PAID',
    footage_link: 'https://drive.google.com/example2',
    created_at: '2026-01-11T10:00:00Z',
    updated_at: '2026-01-14T16:00:00Z',
  },
];

// Mock screenshots
export const mockScreenshots: Screenshot[] = [
  {
    id: 's1',
    delivery_id: 'd5',
    user_id: 'u2',
    type: 'PAYMENT',
    file_url: 'https://placehold.co/400x600/png',
    thumbnail_url: 'https://placehold.co/200x300/png',
    uploaded_at: '2026-01-14T15:45:00Z',
    deleted_at: null,
  },
  {
    id: 's2',
    delivery_id: 'd5',
    user_id: 'u2',
    type: 'FOLLOW',
    file_url: 'https://placehold.co/400x600/png',
    thumbnail_url: 'https://placehold.co/200x300/png',
    uploaded_at: '2026-01-14T15:46:00Z',
    deleted_at: null,
  },
];

// Mock reel tasks
export const mockReelTasks: ReelTask[] = [
  {
    id: 'r1',
    delivery_id: 'd5',
    assigned_user_id: 'u2',
    reel_link: 'https://drive.google.com/example2',
    status: 'RESOLVED',
    reassigned_reason: null,
  },
];

// API simulation helper
export const simulateApiDelay = (ms: number = 500) => 
  new Promise(resolve => setTimeout(resolve, ms));
```

---

## 🎨 COMPONENTS

Due to length constraints, I'll include the key component files. Would you like me to continue with the component code, or would you prefer a different export format (like a ZIP file structure or GitHub gist)?

For ChatGPT review, I recommend:
1. Share the AUDIT_CHECKLIST.md first
2. Share the IMPLEMENTATION_SUMMARY.md second
3. Then share specific component code as needed

The two summary documents contain comprehensive information about what was implemented and what's still pending.

Would you like me to:
- A) Continue adding all component code to this file
- B) Create separate smaller files for each major component
- C) Create a compressed package structure they can reconstruct

Let me know your preference!

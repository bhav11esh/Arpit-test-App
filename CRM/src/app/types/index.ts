// Core domain types based on spec

/**
 * V1 CRITICAL IMMUTABILITY RULES:
 * 
 * 🔒 CONFIG ENTITIES (Cluster, Dealership, Mapping) vs EXECUTION ENTITIES (Delivery, Screenshot, etc.)
 * 
 * Configuration entities are "editable seed data" that define the system environment.
 * Execution entities are operational data that track delivery lifecycle.
 * 
 * ⚠️ BOUNDARY ENFORCEMENT:
 * - Config changes (clusters, dealerships, mappings) apply to FUTURE deliveries only
 * - Once a Delivery is created, it becomes immutable with respect to config changes:
 *   • delivery.showroom_code (string) does NOT update if dealership name changes
 *   • delivery.cluster_code (string) does NOT update if cluster is deleted
 *   • delivery.showroom_type (PRIMARY/SECONDARY) does NOT change if mappings are modified
 *   • delivery.payment_type does NOT change if dealership.paymentType is updated
 * 
 * - Deliveries reference config entities by CODE (string), not by live reference
 * - Config is declarative setup; deliveries are execution state
 * - One-way dependency: execution can READ config (for future creations), NEVER mutate it
 * 
 * This prevents:
 * ❌ Retroactive assignment changes
 * ❌ Historical data corruption
 * ❌ Incentive recalculation on config edits
 * ❌ Reel backlog modification on photographer disable
 */

export type UserRole = 'ADMIN' | 'PHOTOGRAPHER';

// V1 SPEC: No DONE status exists - SEND UPDATE is the only closure
export type DeliveryStatus =
  | 'ASSIGNED'
  | 'UNASSIGNED' // All deliveries not currently assigned (fresh or previously assigned)
  | 'REJECTED'
  | 'REJECTED_CUSTOMER' // Terminal: rejected by customer
  | 'POSTPONED_CANCELED' // Combined status for deliveries that are postponed or canceled
  | 'CANCELED' // Separate status used in some UI logic
  | 'DONE'; // Terminal state after SEND UPDATE

// V1 CRITICAL: Decision state for Accept/Reject workflow
// - WAITING: Delivery is pending photographer response (default)
// - ACCEPTED: At least one photographer accepted
// - REJECTED_BY_ALL: All photographers rejected OR prompt expired with no acceptance
export type DecisionState = 'WAITING' | 'ACCEPTED' | 'REJECTED_BY_ALL';

// V1 CRITICAL: Photographer day state for SEND UPDATE finality
// - ACTIVE: Photographer can interact with deliveries, upload screenshots, edit timing
// - CLOSED: Photographer has triggered SEND UPDATE - no further actions allowed
export type PhotographerDayState = 'ACTIVE' | 'CLOSED';

export type ScreenshotType = 'PAYMENT' | 'FOLLOW';

export type PaymentType = 'CUSTOMER_PAID' | 'DEALER_PAID';

export type ShowroomType = 'PRIMARY' | 'SECONDARY';

export type ReelStatus = 'PENDING' | 'RESOLVED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  phone_number?: string | null;
  cluster_code?: string; // Photographer's assigned cluster (for Accept/Reject matching)
}

export interface Delivery {
  id: string;
  date: string; // YYYY-MM-DD
  showroom_code: string;
  cluster_code: string;
  // V1 CRITICAL: showroom_type is the ORIGIN TYPE (not assignment status)
  // - This field represents the delivery's INTRINSIC classification for this date
  // - PRIMARY = showroom has a default photographer assigned for today
  // - SECONDARY = showroom has no primary photographer today (e.g., photographer on leave)
  // - This NEVER changes based on acceptance/rejection
  // - Accept/Reject prompts apply to BOTH unassigned PRIMARY and SECONDARY deliveries
  // - Assignment status is tracked separately via assigned_user_id and status fields
  showroom_type: ShowroomType; // PRIMARY or SECONDARY (originType - immutable for this date)
  timing: string | null; // HH:MM
  delivery_name: string; // V1 RULE: Format is DD-MM-YYYY_SHOWROOM_X or DD-MM-YYYY_SHOWROOM_HH_MM
  status: DeliveryStatus;
  assigned_user_id: string | null;
  payment_type: PaymentType;
  footage_link: string | null;
  reel_link?: string | null; // V1 SPEC: Added for ViewScreen sync
  created_at: string;
  updated_at: string;
  // V1 CRITICAL: Decision state tracks the collective Accept/Reject outcome
  // - WAITING: No one has accepted yet (prompt active or not yet shown)
  // - ACCEPTED: Delivery was accepted by a photographer
  // - REJECTED_BY_ALL: All photographers rejected OR delivery time reached with no acceptance
  decisionState?: DecisionState;
  // V1 FIX: Delivery-level rejection tracking (not per-user)
  rejected_by_all?: boolean; // DEPRECATED - use decisionState instead
  rejected_by_all_timestamp?: string;
  unassignment_reason?: string; // V1 SPEC: For primary delivery unassignment logging
  unassignment_timestamp?: string;
  unassignment_by?: string;
  creation_index?: number; // V1 SPEC: _1/_2/_3 is permanent creation index, never changes, even when timing is added
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

// V1 ADMIN CONFIGURATION ENTITIES
// These entities are ADMIN-ONLY manageable via configuration screens

export interface Cluster {
  id: string;
  name: string;
}

export interface Dealership {
  id: string;
  name: string;
  paymentType: PaymentType;
  googleSheetId?: string;
}

export type MappingType = 'PRIMARY' | 'SECONDARY';

export interface Mapping {
  id: string;
  clusterId: string;
  dealershipId: string;
  photographerId: string | null;
  mappingType: MappingType; // PRIMARY or SECONDARY
  latitude: number;
  longitude: number;
}

// V1 LEAVE MANAGEMENT
// Half-day granularity for photographer leave tracking

export type LeaveHalf = 'FIRST_HALF' | 'SECOND_HALF';

export type LeaveAppliedBy = 'PHOTOGRAPHER' | 'ADMIN';

export interface Leave {
  id: string;
  photographerId: string;
  date: string; // YYYY-MM-DD
  half: LeaveHalf; // FIRST_HALF or SECOND_HALF
  appliedBy: LeaveAppliedBy; // Who created this leave
  appliedAt: string; // ISO timestamp
}

export interface DeliveryRejection {
  id: string;
  delivery_id: string;
  user_id: string;
  rejected_at: string;
}

/**
 * V1 LEAVE INTEGRATION RULES:
 * 
 * - If a photographer is on leave (FIRST_HALF or SECOND_HALF):
 *   → Their PRIMARY showroom behaves as SECONDARY for that cluster during that half
 * - Leave does NOT break incentive streaks
 * - Leave counts as 0 deliveries for that day/half
 * - Once applied by photographer, only ADMIN can remove/edit
 * - Full-day leave = FIRST_HALF + SECOND_HALF records on same date
 * - Leaves are retained for at least 2 months for salary reconciliation
 */
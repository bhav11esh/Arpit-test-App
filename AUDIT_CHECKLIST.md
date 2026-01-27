# V1 SPEC COMPLIANCE AUDIT - Delivery Operations App

**Date:** January 12, 2026
**Status Legend:** ✅ Compliant | ⚠️ Partial | ❌ Non-Compliant | 🔍 Needs Verification

---

## 0. Core Principles (Non-Negotiable)

| Principle | Status | Notes |
|-----------|--------|-------|
| Single-day operational mindset | ✅ | Deliveries filtered by date, no cross-day state |
| No automation that "decides" for humans | ✅ | All actions require explicit user interaction |
| No silent mutations | ✅ | All state changes are user-initiated or time-driven |
| Mobile-first constraints | ✅ | Bottom navigation, tap interactions, no hover states |
| Operational clarity > elegance | ✅ | Explicit labels, status badges, clear sections |

---

## 1. Users & Roles

### 1.1 Photographer Permissions
| Feature | Required | Status | Location |
|---------|----------|--------|----------|
| View today's deliveries | Yes | ✅ | HomeScreen.tsx |
| Accept / Reject deliveries | Yes | ✅ | AcceptRejectDialog.tsx |
| Update delivery timing | Yes | ✅ | DeliveryCard.tsx |
| Upload screenshots (where allowed) | Yes | ⚠️ | **ISSUE: Shows upload buttons for dealer-paid** |
| Paste footage links | Yes | ✅ | DeliveryCard.tsx, SendUpdateSheet.tsx |
| Close day via SEND UPDATE | Yes | ✅ | SendUpdateSheet.tsx |
| View their reel backlog | Yes | ✅ | ReelBacklog.tsx |
| View their own performance | Yes | ✅ | ProfileScreen.tsx, IncentiveTracker.tsx |
| **Cannot** see other screenshots | Yes | ✅ | Filtered by user_id |
| **Cannot** see admin logs | Yes | ✅ | No log UI for photographers |
| **Cannot** delete others' data | Yes | ✅ | Role-based restrictions |
| **Cannot** edit others' spreadsheet rows | Yes | ✅ | Admin-only in ViewScreen |

### 1.2 Admin Permissions
| Feature | Required | Status | Location |
|---------|----------|--------|----------|
| Do everything photographer can | Yes | ✅ | Inherited access |
| View all deliveries | Yes | ✅ | ViewScreen.tsx |
| View all spreadsheet data | Yes | ✅ | ViewScreen.tsx (spreadsheet mode) |
| Edit spreadsheet cells | Yes | ❌ | **MISSING: No cell editing implemented** |
| Undo / Redo spreadsheet edits | Yes | ❌ | **MISSING: No undo/redo stack** |
| Export CSV | Yes | ✅ | ViewScreen.tsx |
| View screenshot galleries | Yes | ✅ | ViewScreen.tsx (payment/follow modes) |
| Delete screenshots | Yes | ✅ | ViewScreen.tsx |
| Reassign reels (with reason) | Yes | ⚠️ | **PARTIAL: UI exists but no reason persistence** |
| View logs & reports | Yes | ❌ | **MISSING: No log viewer component** |
| Delete reports | Yes | ❌ | **MISSING: No report management** |

---

## 2. App Structure

| Feature | Required | Status | Notes |
|---------|----------|--------|-------|
| Bottom Navigation | Yes | ✅ | BottomNav.tsx with 4 tabs |
| Home tab | Yes | ✅ | HomeScreen.tsx |
| Reel Backlog tab | Yes | ✅ | ReelBacklog.tsx |
| View tab | Yes | ✅ | ViewScreen.tsx (Admin) / IncentiveTracker.tsx (Photographer) |
| Profile tab | Yes | ✅ | ProfileScreen.tsx |
| Admin controls inside existing tabs | Yes | ✅ | No separate admin tabs |

---

## 3. Delivery Entity

| Field | Required | Type | Status | Notes |
|-------|----------|------|--------|-------|
| date | Yes | YYYY-MM-DD | ✅ | types/index.ts |
| showroom_code | Yes | string | ✅ | types/index.ts |
| cluster_code | Yes | string | ✅ | types/index.ts |
| delivery_name | Yes | string | ✅ | types/index.ts |
| timing | No | HH:MM \| null | ✅ | types/index.ts |
| status | Yes | DeliveryStatus | ✅ | types/index.ts |
| assigned_user_id | No | string \| null | ✅ | types/index.ts |
| payment_type | Yes | PaymentType | ✅ | types/index.ts |
| footage_link | No | string \| null | ✅ | types/index.ts |

---

## 4. Delivery Naming Rules

| Rule | Status | Implementation | Issues |
|------|--------|----------------|--------|
| Without timing: `DD-MM-YYYY_SHOWROOM_N` | ✅ | utils.ts `generateDeliveryName()` | ✅ Correct |
| With timing: `DD-MM-YYYY_SHOWROOM_HH_MM` | ✅ | utils.ts `generateDeliveryName()` | ✅ Correct |
| Timing update overwrites name | ⚠️ | HomeScreen.tsx line 80-87 | 🔍 **Need to verify incremental suffix removal** |
| No reordering on timing change | ✅ | No sorting logic exists | ✅ Correct |

---

## 5. Delivery Statuses

| Status | Allowed | Status | Notes |
|--------|---------|--------|-------|
| PENDING | Yes | ✅ | types/index.ts |
| ASSIGNED | Yes | ✅ | types/index.ts |
| REJECTED | Yes | ✅ | types/index.ts |
| REJECTED_CUSTOMER | Yes | ✅ | types/index.ts |
| POSTPONED | Yes | ✅ | types/index.ts |
| CANCELED | Yes | ✅ | types/index.ts |
| DONE | Yes | ✅ | types/index.ts |

### Status Invariants
| Rule | Status | Location | Issues |
|------|--------|----------|--------|
| REJECTED_CUSTOMER: Only for Customer-paid | ❌ | **MISSING: No validation logic** | Need to add check |
| REJECTED_CUSTOMER: Never reassignable | ❌ | **MISSING: No UI prevention** | Need to disable buttons |
| POSTPONED/CANCELED: Never reassignable | ❌ | **MISSING: No UI prevention** | Need to disable buttons |
| POSTPONED/CANCELED: No timing edits | ❌ | **MISSING: No UI prevention** | Need to disable timing input |
| DONE: Only after SEND UPDATE | ✅ | SendUpdateSheet.tsx | ✅ Correct |
| DONE: Immutable | ⚠️ | **PARTIAL: UI doesn't prevent edits** | Need readonly state |

---

## 6. Home Screen — Delivery Buckets

| Section | Status | Implementation | Issues |
|---------|--------|----------------|--------|
| Deliveries Serviced Today (count) | ✅ | HomeScreen.tsx line 137 | ✅ Correct |
| Primary Deliveries section | ⚠️ | HomeScreen.tsx line 142-162 | **ISSUE: Logic is "ASSIGNED + CUSTOMER_PAID" but spec says "assigned by default"** |
| Secondary Deliveries section | ⚠️ | HomeScreen.tsx line 165-185 | **ISSUE: Logic is "ASSIGNED + DEALER_PAID" but spec says "initially unassigned"** |
| Not Chosen Deliveries section | ✅ | HomeScreen.tsx line 188-208 | ✅ Shows PENDING/REJECTED |

### Bucket Logic Issues
- **PRIMARY**: Spec says "Assigned to photographer by default" (not payment type based)
- **SECONDARY**: Spec says "Initially unassigned" (not payment type based)
- Current implementation uses `payment_type` as bucket discriminator
- Should be based on assignment logic + showroom relationship

---

## 7. Accept / Reject Prompt Flow

| Feature | Required | Status | Location | Issues |
|---------|----------|--------|----------|--------|
| Trigger at T-30 minutes | Yes | ❌ | AcceptRejectDialog.tsx | **Shows immediately, not at T-30** |
| Show to all active photographers in cluster | Yes | ❌ | HomeScreen.tsx | **MISSING: No cluster-based broadcast** |
| First Accept assigns globally | Yes | ❌ | **MISSING: No multi-user state sync** | Need backend |
| Prompt disappears for everyone | Yes | ❌ | **MISSING: No real-time sync** | Need backend |
| Individual Reject action | Yes | ✅ | AcceptRejectDialog.tsx | ✅ Correct |
| All reject → Not Chosen | Yes | ❌ | **MISSING: No multi-user logic** | Need backend |
| Non-responders auto-rejected | Yes | ❌ | **MISSING: No timeout handler** | Need backend |
| Prompt disappears at delivery time | Yes | ⚠️ | AcceptRejectDialog.tsx line 41 | Timer exists but not tied to T-30 |

**CRITICAL GAP:** Accept/Reject logic requires real-time backend coordination

---

## 8. Geofence Logic

| Feature | Required | Status | Location | Issues |
|---------|----------|--------|----------|--------|
| Only deliveries with timing | Yes | ❌ | **MISSING: No geofence component** | Not implemented |
| T-15 minute trigger | Yes | ❌ | **MISSING: No scheduler** | Not implemented |
| Backend schedules check | Yes | ❌ | **MISSING: Backend feature** | Not implemented |
| App reads phone GPS | Yes | ❌ | **MISSING: No GPS access** | Not implemented |
| Alert Photographer if outside | Yes | ❌ | **MISSING: No alert UI** | Not implemented |
| Alert Admin if outside | Yes | ❌ | **MISSING: No alert UI** | Not implemented |
| Log delivery, timestamp, lat/long | Yes | ❌ | **MISSING: No logging** | Not implemented |
| Only one alert per delivery | Yes | ❌ | **MISSING: No dedup logic** | Not implemented |
| Timing update reschedules geofence | Yes | ❌ | **MISSING: No rescheduling** | Not implemented |

**CRITICAL GAP:** Entire geofence system is not implemented

---

## 9. Screenshot Uploads

| Rule | Required | Status | Location | Issues |
|------|----------|--------|----------|--------|
| Customer-Paid: Payment mandatory | Yes | ✅ | SendUpdateSheet.tsx, utils.ts | ✅ Blocks SEND UPDATE |
| Customer-Paid: Follow optional | Yes | ✅ | SendUpdateSheet.tsx | ✅ Never blocks |
| Dealer-Paid: No screenshot buttons | Yes | ❌ | DeliveryCard.tsx | **Shows upload buttons for all deliveries** |
| Quality: Not ultra-high res | Yes | ❌ | **MISSING: No resolution limit** | Not implemented |
| Must preserve metadata | Yes | ❌ | **MISSING: No EXIF preservation** | Not implemented |
| Client-side compression | Yes | ❌ | **MISSING: No compression** | Not implemented |
| Max ~3MB | Yes | ❌ | **MISSING: No file size check** | Not implemented |

**CRITICAL ISSUE:** Screenshot upload UI appears for dealer-paid deliveries (should be hidden)

---

## 10. Screenshot Storage & Retention

| Feature | Required | Status | Location | Issues |
|---------|----------|--------|----------|--------|
| Stored in object storage | Yes | 🔍 | **Backend feature** | Mock data only |
| Thumbnail generated | Yes | 🔍 | **Backend feature** | Mock URLs exist |
| Metadata in DB | Yes | ✅ | types/index.ts Screenshot type | ✅ Schema exists |
| 30-day retention | Yes | ❌ | **MISSING: No TTL logic** | Backend feature |
| Silent auto-delete | Yes | ❌ | **MISSING: No cleanup** | Backend feature |
| Admin delete → storage + DB | Yes | ⚠️ | ViewScreen.tsx | Only sets `deleted_at` (soft delete) |
| Log deletion event | Yes | ❌ | **MISSING: No logging** | Not implemented |

---

## 11. Deliveries Finished? → SEND UPDATE

| Feature | Required | Status | Location | Issues |
|---------|----------|--------|----------|--------|
| Enabled only if assigned deliveries exist | Yes | ✅ | HomeScreen.tsx line 230 | ✅ Correct |
| Disabled until footage links applied | Yes | ✅ | utils.ts `canSendUpdate()` | ✅ Correct |
| Disabled until payment screenshots uploaded | Yes | ✅ | utils.ts `canSendUpdate()` | ✅ Correct |
| Follow never blocks SEND UPDATE | Yes | ✅ | utils.ts line 43-51 | ✅ Correct |
| On SEND: Spreadsheet rows created | Yes | ❌ | **MISSING: No spreadsheet generation** | Not implemented |
| On SEND: Reel backlog tasks created | Yes | ❌ | **MISSING: No task creation** | Not implemented |
| On SEND: Home UI cleared | Yes | ⚠️ | SendUpdateSheet.tsx | Only sets status=DONE |
| On SEND: Button disabled | Yes | ✅ | HomeScreen.tsx | Re-evaluates `hasAssignedDeliveries` |
| No partial updates allowed | Yes | ✅ | utils.ts | All-or-nothing validation |

---

## 12. Footage Link Rules

| Rule | Required | Status | Location | Issues |
|---------|----------|--------|----------|--------|
| Google Drive only | Yes | ❌ | **MISSING: No domain validation** | Need URL check |
| URL validation | Yes | ⚠️ | Input type="url" | Browser validation only |
| Domain validation | Yes | ❌ | **MISSING: No domain check** | Need regex |
| Applied via "Apply" button | Yes | ✅ | DeliveryCard.tsx, SendUpdateSheet.tsx | ✅ Correct |
| Locked after apply | Yes | ⚠️ | DeliveryCard.tsx | Can click "Edit" to change |
| Missing link blocks SEND UPDATE | Yes | ✅ | utils.ts line 38 | ✅ Correct |

**ISSUE:** Should validate `drive.google.com` domain

---

## 13. Reel Backlog

| Feature | Required | Status | Location | Issues |
|---------|----------|--------|----------|--------|
| Exactly 1 reel per delivery | Yes | ✅ | ReelBacklog.tsx | ✅ 1:1 mapping |
| Appears after SEND UPDATE | Yes | ❌ | **MISSING: Tasks not created on SEND** | Not implemented |
| Status: PENDING / RESOLVED | Yes | ✅ | types/index.ts | ✅ Correct enum |
| Pasting reel link resolves task | Yes | ✅ | ReelBacklog.tsx line 49-65 | ✅ Correct |
| Deleting reel link recreates backlog | Yes | ❌ | **MISSING: No deletion logic** | Not implemented |
| Overwriting does NOT recreate | Yes | ✅ | ReelBacklog.tsx | Doesn't recreate |
| Admin: Can reassign | Yes | ✅ | ReelBacklog.tsx | ✅ Has UI |
| Admin: Must provide reason | Yes | ✅ | ReelBacklog.tsx line 68 | ✅ Validation exists |
| Reason shown to new assignee | Yes | ❌ | **MISSING: No UI to display reason** | Not implemented |
| Reason logged permanently | Yes | ❌ | **MISSING: No logging** | Not implemented |

---

## 14. View Section

### Modes
| Mode | Required | Status | Location | Issues |
|------|----------|--------|----------|--------|
| Spreadsheet View | Yes | ✅ | ViewScreen.tsx | ✅ Table component |
| Payment Screenshot Gallery | Yes | ✅ | ViewScreen.tsx | ✅ Grid layout |
| Follow Screenshot Gallery | Yes | ✅ | ViewScreen.tsx | ✅ Grid layout |

### Spreadsheet View
| Feature | Required | Status | Location | Issues |
|---------|----------|--------|----------|--------|
| Editable cells | Yes | ❌ | ViewScreen.tsx | **Table is read-only** |
| Undo / Redo | Yes | ❌ | **MISSING: No history stack** | Not implemented |
| Export CSV | Yes | ✅ | ViewScreen.tsx line 51-68 | ✅ Correct |
| Reel link editable | Yes | ❌ | **MISSING: No inline editing** | Not implemented |
| Row deletion allowed | Yes | ❌ | **MISSING: No delete button** | Not implemented |

### Screenshot Gallery
| Feature | Required | Status | Location | Issues |
|---------|----------|--------|----------|--------|
| Admin only | Yes | ✅ | App.tsx | ✅ Role check |
| 4 images per screen | Yes | ⚠️ | ViewScreen.tsx | Shows 2 per row (grid-cols-2) = ~4 visible |
| Metadata shown | Yes | ✅ | ViewScreen.tsx line 133-145 | ✅ Delivery name + date |
| Delete option | Yes | ✅ | ViewScreen.tsx line 196-203 | ✅ Delete button |
| No restore | Yes | ✅ | ViewScreen.tsx | No restore function |

---

## 15. Incentives

| Rule | Required | Status | Location | Issues |
|------|----------|--------|----------|--------|
| ₹2000 if ≥20 deliveries | Yes | ✅ | utils.ts line 61-86 | ✅ Correct |
| Across 7 consecutive days | Yes | ⚠️ | utils.ts line 76 | **ISSUE: Counts consecutive delivery days, not calendar days** |
| Leave day = 0 deliveries | Yes | ✅ | utils.ts | Implicit (no deliveries = not counted) |
| Leave does NOT break streak | Yes | ❌ | **ISSUE: Current logic requires 7 days WITH deliveries** | Spec says 7 calendar days |
| Only photographer's deliveries count | Yes | ✅ | utils.ts line 67 | ✅ Filters by user_id |

**CRITICAL ISSUE:** Incentive logic should count 7 consecutive **calendar days** with ≥20 total deliveries, not 7 days that all have deliveries.

---

## 16. Reports & Logs

| Feature | Required | Status | Location | Issues |
|---------|----------|--------|----------|--------|
| Reports: Delivery counts | Yes | ❌ | **MISSING: No report generation** | Not implemented |
| Reports: Leaves | Yes | ❌ | **MISSING: No leave tracking** | Not implemented |
| Reports: Reassignments | Yes | ❌ | **MISSING: No report** | Not implemented |
| Reports: Rejections | Yes | ❌ | **MISSING: No report** | Not implemented |
| Reports: Geofence breaches | Yes | ❌ | **MISSING: No geofence** | Not implemented |
| Logs: Immutable | Yes | ❌ | **MISSING: No log system** | Not implemented |
| Logs: Actor, Target, Timestamp | Yes | ✅ | types/index.ts LogEvent | ✅ Schema exists |
| Logs: Reason (if required) | Yes | ✅ | types/index.ts LogEvent | ✅ Metadata field |
| Admin delete report files | Yes | ❌ | **MISSING: No report UI** | Not implemented |
| Cannot delete individual log lines | Yes | ✅ | N/A | No UI exists |

**CRITICAL GAP:** Entire logging and reporting system not implemented

---

## 17. Notifications

| Feature | Required | Status | Location | Issues |
|---------|----------|--------|----------|--------|
| Push notifications | Yes | ❌ | **MISSING: No push setup** | Backend feature |
| In-app notifications | Yes | ⚠️ | sonner toast | Basic toast only |
| No alarms | Yes | ✅ | N/A | None implemented |
| No repeats | Yes | ✅ | N/A | None implemented |
| No escalation chains | Yes | ✅ | N/A | None implemented |
| No silence overrides | Yes | ✅ | N/A | None implemented |

---

## 18. Non-Functional Scope

| Requirement | Status | Notes |
|-------------|--------|-------|
| ≤1000 users | ✅ | Mock data scalable |
| ≤8000 uploads/day | 🔍 | Need backend implementation |
| REST backend | 🔍 | Mock API calls in place |
| Scheduled jobs: Prompts | ❌ | Not implemented |
| Scheduled jobs: Geofence | ❌ | Not implemented |
| Scheduled jobs: Retention cleanup | ❌ | Not implemented |
| Internal distribution only | ✅ | No public access |
| No offline mode | ✅ | Requires network |
| No web UI | ⚠️ | Is web-based (should be native?) |
| No customer access | ✅ | Photographer/Admin only |

---

## 19. Explicitly OUT of Scope (Verification)

| Feature | Status | Notes |
|---------|--------|-------|
| Auto routing | ✅ | Not implemented (correct) |
| Auto reassignment | ✅ | Not implemented (correct) |
| OCR / payment verification | ✅ | Not implemented (correct) |
| Customer apps | ✅ | Not implemented (correct) |
| Refunds | ✅ | Not implemented (correct) |
| Web dashboards | ⚠️ | Currently IS a web app |
| Multi-reel per delivery | ✅ | 1:1 mapping (correct) |
| Analytics dashboards | ✅ | Not implemented (correct) |
| SLA enforcement | ✅ | Not implemented (correct) |
| Performance penalties | ✅ | Not implemented (correct) |

---

## PRIORITY FIXES REQUIRED

### 🔴 CRITICAL (Blocks V1 Compliance)

1. **Hide screenshot upload buttons for Dealer-Paid deliveries** (DeliveryCard.tsx)
   - Current: Shows for all deliveries
   - Required: `if (payment_type === 'DEALER_PAID')` hide buttons entirely

2. **Fix Home Screen bucket logic** (HomeScreen.tsx)
   - Current: Uses payment_type for Primary/Secondary
   - Required: Use assignment/showroom relationship logic

3. **Fix Incentive calculation** (utils.ts)
   - Current: Requires 7 days WITH deliveries
   - Required: 7 consecutive calendar days, ≥20 total deliveries

4. **Prevent edits to POSTPONED/CANCELED/REJECTED_CUSTOMER deliveries**
   - Add readonly logic to DeliveryCard
   - Disable timing/footage/screenshot inputs

5. **Add Google Drive URL validation** (footage links)
   - Validate domain: `drive.google.com`
   - Reject non-Google Drive URLs

### 🟡 HIGH (Missing Core Features)

6. **Implement Geofence system**
   - GPS permission request
   - T-15 minute check
   - Alert UI for photographer + admin
   - Logging with lat/long

7. **Accept/Reject T-30 minute trigger**
   - Current: Shows immediately
   - Required: Schedule at T-30 before delivery timing

8. **SEND UPDATE side effects**
   - Create reel backlog tasks
   - Generate spreadsheet rows
   - Clear home UI

9. **Implement logging system**
   - LogEvent creation for all actions
   - Immutable log storage
   - Admin log viewer UI

10. **Admin spreadsheet editing**
    - Inline cell editing
    - Undo/Redo stack
    - Row deletion

### 🟢 MEDIUM (Enhancements)

11. **Reports generation**
    - Delivery counts
    - Leaves
    - Reassignments
    - Rejections
    - Report deletion UI

12. **Screenshot quality controls**
    - File size validation (max 3MB)
    - Client-side compression
    - Resolution limits
    - EXIF preservation

13. **Reel backlog enhancements**
    - Show reassignment reason to assignee
    - Delete reel link → recreate backlog
    - Permanent logging of reassignments

14. **Push notifications setup**
    - Service worker registration
    - Push permission request
    - Notification payload handling

### 🔵 LOW (Nice-to-Have)

15. **Better date handling**
    - Timezone considerations
    - IST display formatting
    - Calendar date pickers

16. **Screenshot gallery pagination**
    - Exactly 4 per screen (currently ~4 visible)
    - Swipe navigation

17. **Enhanced error handling**
    - Network error recovery
    - Retry logic
    - Offline state detection

---

## SUMMARY

**Total Spec Items:** ~120  
**Fully Compliant:** ~45 (38%)  
**Partially Compliant:** ~25 (21%)  
**Non-Compliant:** ~35 (29%)  
**Backend-Dependent:** ~15 (12%)

**Overall Compliance Score:** ~59% (with 12% pending backend)

**Next Steps:**
1. Fix critical UI bugs (screenshot buttons, bucket logic, incentives)
2. Implement missing validation (Google Drive URLs, file sizes)
3. Add geofence system (requires GPS access)
4. Build logging infrastructure
5. Implement admin spreadsheet editing
6. Add scheduled job triggers (requires backend)

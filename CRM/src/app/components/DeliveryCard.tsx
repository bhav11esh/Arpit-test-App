import React, { useState } from 'react';
import type { Delivery, ScreenshotType } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { getStatusColor, formatTiming, canSelfAssign as canSelfAssignUtil } from '../lib/utils';
import { Clock, MapPin, AlertCircle, Calendar, MoreVertical } from 'lucide-react';
import { UpdateTimingDialog } from './UpdateTimingDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './ui/dropdown-menu';

interface DeliveryCardProps {
  delivery: Delivery;
  screenshots: any[];
  onUpdateTiming?: (deliveryId: string, timing: string) => void;
  onUpdateFootageLink?: (deliveryId: string, link: string) => void;
  onUploadScreenshot?: (deliveryId: string, type: ScreenshotType, file: File) => void;
  onUnassign?: (deliveryId: string) => void;
  readonly?: boolean;
  showAssignability?: boolean; // Show if delivery can be self-assigned
  onSelfAssign?: (deliveryId: string) => void; // Callback for self-assignment
  onPostpone?: (deliveryId: string) => void; // Callback for postpone/cancel action (combined)
  onCancel?: (deliveryId: string) => void; // DEPRECATED - use onPostpone instead
  onRejectedByCustomer?: (deliveryId: string) => void; // Callback for customer rejection
  dayCompleted?: boolean; // V1 SPEC: Prevent assignment after SEND UPDATE
  currentUserId?: string; // To check if current user is assigned
}

export function DeliveryCard({
  delivery,
  screenshots,
  onUpdateTiming,
  readonly = false,
  showAssignability = false,
  onSelfAssign,
  dayCompleted = false,
  onUnassign,
  currentUserId,
  onPostpone,
  onCancel,
  onRejectedByCustomer,
}: DeliveryCardProps) {
  const [showTimingDialog, setShowTimingDialog] = useState(false);

  // V1 CRITICAL: Use centralized canSelfAssign helper
  // Determines photographerDayState based on dayCompleted prop
  const photographerDayState = dayCompleted ? 'CLOSED' : 'ACTIVE';
  const canSelfAssignDelivery = canSelfAssignUtil(delivery, photographerDayState);

  // State-driven button logic per V1 spec
  // V1 RULE: Timing edit allowed for ALL deliveries EXCEPT:
  // - DONE
  // - POSTPONED_CANCELED
  // - REJECTED_CUSTOMER
  // Assignment status (ASSIGNED/UNASSIGNED/REJECTED) must NOT block timing edits
  // V1 FIX: Also blocked when dayCompleted === true (after SEND UPDATE)

  const canEditTiming =
    !readonly &&
    !['REJECTED_CUSTOMER', 'POSTPONED_CANCELED', 'DONE'].includes(delivery.status) &&
    !dayCompleted; // V1 FIX: Hide timing button after SEND UPDATE

  const showActions =
    !readonly &&
    !['DONE', 'REJECTED_CUSTOMER', 'POSTPONED_CANCELED'].includes(delivery.status) &&
    !dayCompleted; // V1 FIX: Hide all actions after SEND UPDATE

  // Check if current user can unassign this delivery
  const canUnassign =
    delivery.status === 'ASSIGNED' &&
    delivery.assigned_user_id === currentUserId &&
    !dayCompleted &&
    !readonly;

  // Check if "Assign Me" button should be shown
  const canAssignSelf =
    (delivery.status === 'UNASSIGNED' || (delivery.status === 'REJECTED' && canSelfAssignDelivery)) &&
    !dayCompleted &&
    !readonly;

  // Check if Postpone/Cancel options should be shown for REJECTED deliveries
  const canMarkAsPostponedOrCanceled =
    delivery.status === 'REJECTED' &&
    !dayCompleted &&
    !readonly &&
    (onPostpone || onCancel);

  // V1 BUSINESS RULE: "Rejected by Customer" only available for CUSTOMER_PAID deliveries
  const canMarkAsRejectedByCustomer =
    delivery.payment_type === 'CUSTOMER_PAID' &&
    (delivery.status === 'ASSIGNED' || delivery.status === 'UNASSIGNED' || delivery.status === 'REJECTED') &&
    !dayCompleted &&
    !readonly &&
    onRejectedByCustomer;

  // V1 CRITICAL: Assignability blocked conditions
  const assignabilityBlocked =
    ['REJECTED_CUSTOMER', 'POSTPONED_CANCELED'].includes(delivery.status) ||
    dayCompleted;

  const handleTimingUpdate = (timing: string) => {
    if (onUpdateTiming) {
      onUpdateTiming(delivery.id, timing);
    }
  };

  const handleUnassign = () => {
    if (onUnassign) {
      onUnassign(delivery.id);
    }
  };

  const handleAssignSelf = () => {
    if (onSelfAssign) {
      onSelfAssign(delivery.id);
    }
  };

  const handlePostpone = () => {
    if (onPostpone) {
      onPostpone(delivery.id);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel(delivery.id);
    }
  };

  const handleRejectedByCustomer = () => {
    if (onRejectedByCustomer) {
      onRejectedByCustomer(delivery.id);
    }
  };

  // V2.0 DESIGN: Status-based accent class
  const getAccentClass = () => {
    switch (delivery.status) {
      case 'ASSIGNED': return 'delivery-accent-assigned';
      case 'DONE': return 'delivery-accent-done';
      case 'REJECTED':
      case 'REJECTED_CUSTOMER': return 'delivery-accent-rejected';
      default: return 'delivery-accent-pending';
    }
  };

  return (
    <>
      <Card className={`shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${getAccentClass()}`}>
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="flex-1 min-w-0 overflow-hidden">
              <CardTitle className="text-sm sm:text-base truncate">{delivery.delivery_name}</CardTitle>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs sm:text-sm text-gray-500 min-w-0">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-orange-400" />
                <span className="truncate">{delivery.showroom_code} • {delivery.cluster_code}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Badge
                className={`${getStatusColor(delivery.status)} text-[10px] sm:text-xs px-1.5 sm:px-2`}
              >
                {delivery.status}
              </Badge>

              {/* Action Dropdown Menu - Show when ANY action is available */}
              {(canUnassign || canAssignSelf || canMarkAsPostponedOrCanceled || canMarkAsRejectedByCustomer) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canAssignSelf && (
                      <DropdownMenuItem
                        onClick={handleAssignSelf}
                        className="text-green-600 focus:text-green-600"
                      >
                        Assign Me
                      </DropdownMenuItem>
                    )}
                    {canUnassign && (
                      <DropdownMenuItem
                        onClick={handleUnassign}
                        className="text-red-600 focus:text-red-600"
                      >
                        Unassign Me
                      </DropdownMenuItem>
                    )}
                    {(canUnassign || canAssignSelf || canMarkAsPostponedOrCanceled) && onPostpone && (
                      <DropdownMenuItem
                        onClick={handlePostpone}
                        className="text-orange-600 focus:text-orange-600"
                      >
                        Mark as Postponed/Canceled
                      </DropdownMenuItem>
                    )}
                    {canMarkAsRejectedByCustomer && (
                      <DropdownMenuItem
                        onClick={handleRejectedByCustomer}
                        className="text-red-700 focus:text-red-700"
                      >
                        Mark as Rejected by Customer
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 px-3 sm:px-6">
          {/* Date & Timing */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{new Date(delivery.date).toLocaleDateString('en-IN')}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0 overflow-hidden">
                <Clock className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                {delivery.timing ? (
                  <span className="font-medium text-gray-900 truncate">{formatTiming(delivery.timing)}</span>
                ) : (
                  <span className="text-gray-400 italic">No timing set</span>
                )}
              </div>

              {/* Update Timing Button - Only if can edit */}
              {canEditTiming && onUpdateTiming && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-orange-600 border-orange-200 hover:bg-orange-50 text-xs h-7 px-2 flex-shrink-0"
                  onClick={() => setShowTimingDialog(true)}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Update Timing
                </Button>
              )}
            </div>
          </div>

          {/* V1 SPEC: Geofence location check info (non-blocking) */}
          {delivery.timing && delivery.status === 'ASSIGNED' && (
            <div className="p-2 bg-orange-50 border border-orange-100 rounded-lg space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-orange-700">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="font-medium">Location checked 15 min before delivery</span>
              </div>
              <p className="text-[10px] sm:text-xs text-orange-500 pl-[18px]">
                Recalculates if timing changes. Alert fires once.
              </p>
            </div>
          )}

          {/* Payment Type Badge - V1 SPEC: Explicit visual tag mandatory for new hires */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={`text-[10px] sm:text-xs ${
                delivery.payment_type === 'CUSTOMER_PAID'
                  ? 'bg-zinc-50 text-zinc-700 border-zinc-200 font-medium'
                  : 'bg-gray-50 text-gray-600 border-gray-200 font-medium'
              }`}
            >
              {delivery.payment_type === 'CUSTOMER_PAID' ? '💳 Customer Paid' : '🏢 Dealer Paid'}
            </Badge>
            {/* V1 CRITICAL: Origin Type (PRIMARY/SECONDARY) is IMMUTABLE metadata
                - Represents the delivery's intrinsic classification for THIS DATE
                - PRIMARY = showroom has a default photographer assigned for today
                - SECONDARY = showroom has no primary photographer today (e.g., on leave)
                - This NEVER changes based on accept/reject/status changes
                - Status (PENDING/ASSIGNED/REJECTED) is separate from origin type */}
            {delivery.showroom_type && (
              <Badge
                variant="outline"
                className={`text-[10px] sm:text-xs ${
                  delivery.showroom_type === 'PRIMARY'
                    ? 'bg-orange-50 text-orange-700 border-orange-200 font-medium'
                    : 'bg-amber-50 text-amber-700 border-amber-200 font-medium'
                }`}
              >
                {delivery.showroom_type === 'PRIMARY' ? '📍 Primary' : '📍 Secondary'}
              </Badge>
            )}
          </div>

          {/* State Warning Messages */}
          {delivery.status === 'DONE' && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-700">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Delivery completed — No actions available</span>
            </div>
          )}

          {delivery.status === 'REJECTED_CUSTOMER' && (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Rejected by customer — No actions available</span>
            </div>
          )}

          {delivery.status === 'POSTPONED_CANCELED' && (
            <div className="flex items-center gap-2 p-2.5 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-700">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Delivery postponed — No timing edits allowed</span>
            </div>
          )}

          {/* Assignability Indicator for Not Chosen Deliveries */}
          {showAssignability && canSelfAssignDelivery && (
            <div className="flex items-center gap-2 p-2.5 bg-orange-50 border border-orange-100 rounded-lg text-xs text-orange-700">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>✅ Available for self-assignment</span>
            </div>
          )}

          {showAssignability && assignabilityBlocked && (
            <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-600">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                ❌ Not assignable -
                {delivery.status === 'REJECTED_CUSTOMER' && 'Rejected by customer'}
                {delivery.status === 'POSTPONED_CANCELED' && 'Postponed by admin'}
                {dayCompleted && 'Day completed'}
              </span>
            </div>
          )}

          {/* Additional Info for Active Deliveries */}
          {showActions && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] sm:text-xs text-gray-400">
                {delivery.payment_type === 'CUSTOMER_PAID'
                  ? '📸 Payment screenshot required at day close'
                  : '📁 Footage link required before Send Update'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timing Update Modal */}
      {canEditTiming && onUpdateTiming && (
        <UpdateTimingDialog
          open={showTimingDialog}
          onClose={() => setShowTimingDialog(false)}
          currentTiming={delivery.timing}
          deliveryName={delivery.delivery_name}
          onUpdate={handleTimingUpdate}
        />
      )}
    </>
  );
}

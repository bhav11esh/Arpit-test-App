import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Plus, Clock, Trash2, AlertCircle } from 'lucide-react';
import type { Delivery } from '../types';
import { toast } from 'sonner';

/**
 * TimingPrompt Component - V1 SPEC: Hourly Timing Input Flow
 * 
 * 🔄 CORE MECHANISM:
 * - Starts at 9:00 AM
 * - Repeats every 1 hour
 * - Stops only when all deliveries for that showroom are finalized (timing known OR explicitly deferred)
 * 
 * 📋 DELIVERY CREATION RULES:
 * - Deliveries do NOT exist by default
 * - Showroom existence ≠ delivery existence
 * - A delivery object is created ONLY when photographer explicitly adds one via this prompt
 * - ❌ No admin-created delivery
 * - ❌ No system auto-creation
 * - ❌ No inference from showroom/cluster existence
 * 
 * 🏷️ NAMING CONVENTION:
 * - No timing: DD-MM-YYYY_SHOWROOM_1, _2, _3 (incremental creation index)
 * - With timing: DD-MM-YYYY_SHOWROOM_HH_MM
 * - Numbers are IDENTITY SUFFIXES, not ordering
 * - Once created, creation_index never changes
 * 
 * ⏱️ TIMING UPDATES:
 * - During prompt: Creates time-based name immediately
 * - Later via Home UI: Updates name from incremental to time-based
 * - Timing updates regenerate delivery name
 * - Geofence logic recalculates when timing is added
 * 
 * 🛑 STOP CONDITION:
 * - Prompt stops when ALL deliveries have: timing OR explicitly deferred via "Later"
 */

export interface TimingPromptProps {
  showroomCode: string;
  showroomName: string;
  clusterCode: string;
  date: string; // YYYY-MM-DD
  existingDeliveries: Delivery[]; // Deliveries already created for this showroom+date
  onAddDelivery: (timing: string | null) => void; // null = deferred/"Later"
  onDeleteDelivery: (deliveryId: string) => void;
  onUpdateTiming: (deliveryId: string, timing: string) => void;
  onDismiss: () => void;
  photographerId: string;
  paymentType: 'CUSTOMER_PAID' | 'DEALER_PAID';
  showroomType: 'PRIMARY' | 'SECONDARY';
}

export function TimingPrompt({
  showroomCode,
  showroomName,
  clusterCode,
  date,
  existingDeliveries,
  onAddDelivery,
  onDeleteDelivery,
  onUpdateTiming,
  onDismiss,
  photographerId,
  paymentType,
  showroomType,
}: TimingPromptProps) {
  const [newDeliveryTiming, setNewDeliveryTiming] = useState<string>('');

  // Format date for display (DD-MM-YYYY)
  const formatDateDisplay = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

  // Validate timing format HH:MM
  const isValidTiming = (timing: string): boolean => {
    const pattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return pattern.test(timing);
  };

  const handleAddWithTiming = () => {
    if (!newDeliveryTiming.trim()) {
      // Add without timing (deferred/"Later")
      onAddDelivery(null);
      setNewDeliveryTiming('');
      return;
    }

    if (!isValidTiming(newDeliveryTiming)) {
      toast.error('Invalid timing format. Use HH:MM (e.g., 09:30, 14:00)');
      return;
    }

    onAddDelivery(newDeliveryTiming);
    setNewDeliveryTiming('');
  };

  const handleMarkLater = () => {
    // V1 SPEC: "Later" explicitly means timing unknown
    // This is recorded as delivery with null timing
    onAddDelivery(null);
    toast.info('Delivery added without timing. You can update timing later from Home screen.');
  };

  const deliveryCount = existingDeliveries.length;
  const deliveriesWithTiming = existingDeliveries.filter(d => d.timing).length;
  const deliveriesWithoutTiming = existingDeliveries.filter(d => !d.timing).length;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Delivery Timing Input
          </DialogTitle>
          <DialogDescription>
            {showroomName} • {formatDateDisplay(date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">{/* Scrollable content area */}
          {/* Existing Deliveries Count */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="text-sm font-medium text-gray-700">
              Current Status:
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Deliveries:</span>
              <span className="font-semibold">{deliveryCount}</span>
            </div>
            {deliveryCount > 0 && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-600">With Timing:</span>
                  <span className="font-semibold text-green-600">{deliveriesWithTiming}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-orange-600">Without Timing:</span>
                  <span className="font-semibold text-orange-600">{deliveriesWithoutTiming}</span>
                </div>
              </>
            )}
          </div>

          {/* Existing Deliveries List */}
          {existingDeliveries.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Existing Deliveries:</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {existingDeliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{delivery.delivery_name}</div>
                      <div className="text-xs text-gray-500">
                        {delivery.timing ? (
                          <span className="text-green-600">Timing: {delivery.timing}</span>
                        ) : (
                          <span className="text-orange-600">No timing yet</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (window.confirm(`Delete delivery "${delivery.delivery_name}"?`)) {
                          onDeleteDelivery(delivery.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Delivery Section */}
          <div className="space-y-3 p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <Label className="text-sm font-medium">Add New Delivery:</Label>
            
            <div className="space-y-2">
              <Label htmlFor="timing" className="text-sm">
                Delivery Timing (optional)
              </Label>
              <Input
                id="timing"
                type="time"
                value={newDeliveryTiming}
                onChange={(e) => setNewDeliveryTiming(e.target.value)}
                placeholder="HH:MM (e.g., 09:30)"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddWithTiming}
                className="flex-1"
                disabled={!newDeliveryTiming.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add with Timing
              </Button>
              
              <Button
                onClick={handleMarkLater}
                variant="outline"
                className="flex-1"
              >
                <Clock className="h-4 w-4 mr-2" />
                Later (No Timing)
              </Button>
            </div>
            
            <p className="text-xs text-gray-500">
              Click "Later" to add delivery without timing. You can update timing later from Home screen.
            </p>
          </div>

          {/* Info Banner */}
          <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Timing Input Rules:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>This prompt repeats hourly until all deliveries have timing</li>
                <li>You can add multiple deliveries for this showroom</li>
                <li>Use "Later" to create delivery without timing (update later)</li>
                <li>Use "Done for Now" to dismiss this prompt (comes back in 1 hour)</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onDismiss}
            className="flex-1"
          >
            Done for Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
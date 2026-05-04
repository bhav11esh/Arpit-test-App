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
  onMarkAllAdded: () => void;
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
  onMarkAllAdded,
}: TimingPromptProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDeliveryTiming, setNewDeliveryTiming] = useState<string>('');

  // Format date for display (DD-MM-YYYY)
  const formatDateDisplay = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

  // Validate timing format HH:MM (optionally HH:MM:SS)
  const isValidTiming = (timing: string): boolean => {
    // Relaxed regex to allow HH:MM or HH:MM:SS
    const pattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/;
    return pattern.test(timing);
  };

  const handleAddWithTiming = () => {
    if (!newDeliveryTiming.trim()) {
      // Add without timing (deferred/"Later")
      onAddDelivery(null);
      setNewDeliveryTiming('');
      setShowAddForm(false);
      return;
    }

    if (!isValidTiming(newDeliveryTiming)) {
      console.error('Invalid timing value:', newDeliveryTiming);
      toast.error(`Invalid timing format: "${newDeliveryTiming}". Use HH:MM (e.g., 09:30)`);
      return;
    }

    onAddDelivery(newDeliveryTiming);
    setNewDeliveryTiming('');
    setShowAddForm(false);
  };

  const handleMarkLater = () => {
    // V1 SPEC: "Later" explicitly means timing unknown
    // This is recorded as delivery with null timing
    onAddDelivery(null);
    setShowAddForm(false);
  };

  const deliveryCount = existingDeliveries.length;
  const deliveriesWithTiming = existingDeliveries.filter(d => d.timing).length;
  const deliveriesWithoutTiming = existingDeliveries.filter(d => !d.timing).length;

  return (
    <Dialog open={true} onOpenChange={() => { }}>
      <DialogContent
        className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden border-0 shadow-2xl rounded-3xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        hideCloseButton={true}
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-white">
              <div className="h-10 w-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-inner">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                 <span className="text-xl font-bold tracking-tight">Delivery Timing</span>
                 <span className="text-xs font-medium text-indigo-100 opacity-80 uppercase tracking-widest">{showroomName}</span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-indigo-100/70 text-xs font-medium mt-1">
              {formatDateDisplay(date)} • Cluster: {clusterCode}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 overflow-y-auto flex-1 p-6 scrollbar-hide">
          {/* Existing Deliveries Count */}
          <div className="bg-white border border-indigo-50 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
               <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Active Status</div>
               <Badge className="bg-indigo-50 text-indigo-600 border-0 text-[10px] h-5">{deliveryCount} TOTAL</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-indigo-50">
               <div className="flex flex-col">
                  <span className="text-2xl font-bold text-emerald-600 tracking-tighter">{deliveriesWithTiming}</span>
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">With Timing</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-2xl font-bold text-indigo-600 tracking-tighter">{deliveriesWithoutTiming}</span>
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">No Timing</span>
               </div>
            </div>
          </div>

          {/* Existing Deliveries List */}
          {existingDeliveries.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 ml-1">
                <div className="h-1 w-1 rounded-full bg-gray-300"></div>
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Added Deliveries</Label>
              </div>
              <div className="grid gap-2 max-h-52 overflow-y-auto pr-1">
                {existingDeliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="flex items-center justify-between p-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-indigo-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="font-bold text-sm text-gray-800 truncate tracking-tight">{delivery.delivery_name}</div>
                      <div className="text-[10px] mt-0.5 flex items-center gap-1.5 font-bold uppercase tracking-wide">
                        {delivery.timing ? (
                          <span className="text-emerald-500">Timing: {delivery.timing}</span>
                        ) : (
                          <span className="text-indigo-400">Timing pending</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                      onClick={() => {
                        if (window.confirm(`Delete delivery "${delivery.delivery_name}"?`)) {
                          onDeleteDelivery(delivery.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Delivery Section */}
          {!showAddForm ? (
            <Button
              variant="outline"
              className="w-full border-2 border-dashed border-indigo-100 h-14 text-indigo-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all rounded-2xl flex flex-col items-center justify-center gap-0.5"
              onClick={() => setShowAddForm(true)}
            >
              <div className="flex items-center gap-2">
                 <Plus className="h-4 w-4" />
                 <span className="font-bold text-sm tracking-tight">ADD NEW DELIVERY</span>
              </div>
              <span className="text-[10px] font-medium opacity-60 uppercase tracking-widest">Click to log another</span>
            </Button>
          ) : (
            <div className="space-y-4 p-5 border border-indigo-100 bg-indigo-50/30 rounded-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Add Delivery Details</Label>
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} className="h-7 px-2 text-indigo-400 hover:text-indigo-600 hover:bg-transparent text-[11px] font-bold">CANCEL</Button>
              </div>
 
              <div className="space-y-2">
                <Label htmlFor="timing" className="text-[10px] font-bold text-indigo-400/70 uppercase tracking-wider ml-1">
                  Delivery Timing (optional)
                </Label>
                <Input
                  id="timing"
                  type="time"
                  value={newDeliveryTiming}
                  onChange={(e) => setNewDeliveryTiming(e.target.value)}
                  placeholder="HH:MM"
                  className="h-11 bg-white border-indigo-50 rounded-xl focus-visible:ring-indigo-500"
                />
              </div>
 
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleAddWithTiming}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11 rounded-xl font-bold"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add with Timing
                </Button>
 
                <Button
                  onClick={handleMarkLater}
                  variant="outline"
                  className="h-10 border-indigo-100 text-indigo-600 bg-white hover:bg-indigo-50 rounded-xl text-xs font-bold"
                >
                  <Clock className="h-3.5 w-3.5 mr-2" />
                  Decide Timing Later
                </Button>
              </div>
            </div>
          )}

          {/* Info Banner */}
          <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-blue-800">
              <p className="font-medium mb-1">Timing Input Rules:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>This prompt repeats hourly until finalized.</li>
                <li>Add multiple deliveries if needed via the "Add Delivery" button.</li>
                <li><strong>"All Deliveries Logged"</strong>: Finalizes this showroom for the entire cluster today.</li>
                <li><strong>"Snooze 1h"</strong>: Pauses this prompt for 1 hour.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-gray-50 flex gap-3">
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl font-bold"
            onClick={onMarkAllAdded}
          >
            All Deliveries Logged
          </Button>
          <Button
            className="flex-1 h-12 rounded-xl border-gray-100 text-gray-500 hover:bg-gray-50 text-xs font-bold"
            variant="outline"
            onClick={onDismiss}
          >
            Snooze 1h
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Clock } from 'lucide-react';

interface UpdateTimingDialogProps {
  open: boolean;
  onClose: () => void;
  currentTiming: string | null;
  deliveryName: string;
  onUpdate: (timing: string) => void;
}

export function UpdateTimingDialog({
  open,
  onClose,
  currentTiming,
  deliveryName,
  onUpdate
}: UpdateTimingDialogProps) {
  const [timing, setTiming] = useState(currentTiming || '');

  const handleSubmit = () => {
    if (!timing) {
      return;
    }
    onUpdate(timing);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#2563EB]" />
            Update Timing
          </DialogTitle>
          <DialogDescription>
            Set delivery time for <span className="font-semibold text-gray-900">{deliveryName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="timing">Delivery Time</Label>
            <Input
              id="timing"
              type="time"
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
              className="text-lg"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="text-blue-900">
              <span className="font-semibold">Important:</span> Setting timing will:
            </p>
            <ul className="list-disc list-inside text-blue-800 mt-2 space-y-1">
              <li><strong>Update the delivery name automatically</strong> to include time (DD-MM-YYYY_SHOWROOM_HH_MM)</li>
              <li>Internal index (_1/_2/_3) remains unchanged and is non-chronological</li>
              <li>Reschedule geofence check (T-15) and accept/reject prompt (T-30)</li>
            </ul>
            <p className="text-xs text-blue-700 mt-2 italic">
              Note: _1/_2/_3 suffixes do not reorder or have any time-based meaning.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#2563EB] hover:bg-blue-700"
            onClick={handleSubmit}
            disabled={!timing}
          >
            Update Timing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
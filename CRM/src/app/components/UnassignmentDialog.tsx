import React, { useState } from 'react';
import type { Delivery } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { AlertCircle } from 'lucide-react';

interface UnassignmentDialogProps {
  open: boolean;
  delivery: Delivery;
  photographerName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function UnassignmentDialog({
  open,
  delivery,
  photographerName,
  onConfirm,
  onCancel,
}: UnassignmentDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError('Reason is required for unassigning a primary delivery');
      return;
    }

    onConfirm(reason);
    setReason('');
    setError('');
  };

  const handleCancel = () => {
    setReason('');
    setError('');
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unassign Primary Delivery</DialogTitle>
          <DialogDescription>
            You are about to unassign a primary delivery. Please provide a reason for this action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Delivery Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
            <div className="text-sm font-semibold text-blue-900">
              {delivery.delivery_name}
            </div>
            <div className="text-xs text-blue-700">
              Photographer: {photographerName}
            </div>
            <div className="text-xs text-blue-700">
              Showroom: {delivery.showroom_code} ({delivery.showroom_type})
            </div>
          </div>

          {/* V1 SPEC: Primary unassignment requires reason */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              <strong>V1 Rule:</strong> Unassigning a primary delivery requires a documented reason. This will be logged with timestamp and photographer name for audit purposes.
            </p>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Unassignment *</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this primary delivery is being unassigned..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              className={error ? 'border-red-500' : ''}
              rows={4}
            />
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm Unassignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

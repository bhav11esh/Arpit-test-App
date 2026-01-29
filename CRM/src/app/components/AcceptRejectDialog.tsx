import React, { useState, useEffect } from 'react';
import type { Delivery } from '../types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { Clock, MapPin, Calendar, Info } from 'lucide-react';

interface AcceptRejectDialogProps {
  delivery: Delivery;
  onAccept: (deliveryId: string) => void;
  onReject: (deliveryId: string) => void;
  onClose: () => void;
  onExpiry?: (deliveryId: string) => void; // V1 FIX: Delivery-level expiry (not per-user auto-reject)
}

export function AcceptRejectDialog({
  delivery,
  onAccept,
  onReject,
  onClose,
  onExpiry,
}: AcceptRejectDialogProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!delivery.timing) return;

    const calculateTimeRemaining = () => {
      const [year, month, day] = delivery.date.split('-').map(Number);
      const [hours, minutes] = delivery.timing!.split(':').map(Number);
      const deliveryTime = new Date(year, month - 1, day, hours, minutes);
      const now = new Date();
      const diff = deliveryTime.getTime() - now.getTime();

      // V1 SPEC: When delivery time is reached, just close prompt and notify parent
      // Parent will check if anyone accepted, else mark as "Rejected by all"
      // NO per-user auto-reject entries
      if (diff <= 0) {
        if (onExpiry) {
          onExpiry(delivery.id);
        }
        return 0;
      }

      return diff;
    };

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeLeft(remaining);
      
      // V1 SPEC: Close dialog when delivery time passes with no accept
      if (remaining === 0) {
        onClose();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [delivery, onClose, onExpiry]);

  const formatTimeLeft = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatExpiryTime = () => {
    const deliveryTime = new Date(`${delivery.date}T${delivery.timing}`);
    return deliveryTime.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-gray-900">
            <Info className="h-5 w-5 text-blue-500" />
            Delivery Available in Your Cluster
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                This delivery is available for acceptance. Would you like to take it?
              </p>
              
              <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="font-semibold text-gray-900">{delivery.delivery_name}</div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{delivery.showroom_code} • {delivery.cluster_code}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(delivery.date).toLocaleDateString('en-IN')}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{delivery.timing}</span>
                </div>
                
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {delivery.payment_type.replace('_', ' ')}
                  </Badge>
                  {delivery.showroom_type && (
                    <Badge 
                      variant="outline" 
                      className={
                        delivery.showroom_type === 'PRIMARY'
                          ? 'bg-blue-50 text-blue-700 border-blue-300 text-xs'
                          : 'bg-amber-50 text-amber-700 border-amber-300 text-xs'
                      }
                    >
                      {delivery.showroom_type}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm text-gray-700">
                  Available until:
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {formatExpiryTime()} <span className="text-xs text-gray-500">({formatTimeLeft(timeLeft)} remaining)</span>
                </span>
              </div>

              {/* V1 SPEC: Clear expiry behavior explanation */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-900 mb-1">⏱️ Delivery-Level Expiry (Not Per-User)</p>
                <p className="text-xs text-amber-800 mb-2">
                  <strong>Accept:</strong> Assigns delivery to you immediately (first-click-wins).<br />
                  <strong>Reject:</strong> Marks only you as not interested (delivery remains available to others).
                </p>
                <p className="text-xs text-amber-800">
                  <strong>⚠️ If no one accepts before delivery time, this delivery will move to Not Chosen.</strong>
                </p>
              </div>

              <p className="text-xs text-gray-500">
                If multiple photographers accept, the first acceptance is assigned (first-click-wins).
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={() => onReject(delivery.id)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Not for Me
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => onAccept(delivery.id)}
            className="bg-[#2563EB] hover:bg-blue-700"
          >
            Accept Delivery
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
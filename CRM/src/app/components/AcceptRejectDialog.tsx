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
      <AlertDialogContent className="p-0 overflow-hidden border-0 shadow-2xl rounded-3xl max-w-lg">
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2.5 text-white">
              <div className="h-10 w-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-inner">
                <Info className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                 <span className="text-xl font-bold tracking-tight">New Delivery Match</span>
                 <span className="text-[10px] font-bold text-orange-100 opacity-60 uppercase tracking-widest">Available in your cluster</span>
              </div>
            </AlertDialogTitle>
          </AlertDialogHeader>
        </div>

        <AlertDialogDescription asChild>
          <div className="p-6 space-y-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              A new delivery has been reported. Would you like to accept it?
            </p>
            
            <div className="stat-card-primary border-0 p-5 space-y-4">
              <div className="font-bold text-lg text-orange-800 tracking-tight leading-tight">{delivery.delivery_name}</div>
              
              <div className="grid grid-cols-2 gap-y-3">
                <div className="flex items-center gap-2 text-[11px] font-bold text-orange-500/80 uppercase tracking-tight">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{delivery.showroom_code}</span>
                </div>
                
                <div className="flex items-center gap-2 text-[11px] font-bold text-orange-500/80 uppercase tracking-tight">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{delivery.timing}</span>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-bold text-orange-500/80 uppercase tracking-tight">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(delivery.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                </div>

                <div className="flex gap-1.5">
                  <Badge className="bg-orange-50 text-orange-600 border-0 text-[9px] px-1.5 py-0 h-4 font-bold">
                    {delivery.payment_type.replace('_', ' ')}
                  </Badge>
                  {delivery.showroom_type && (
                    <Badge 
                      className={`text-[9px] px-1.5 py-0 h-4 font-bold border-0 ${
                        delivery.showroom_type === 'PRIMARY'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {delivery.showroom_type}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 p-3.5 bg-orange-50/50 border border-orange-100 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Available Until</span>
                <span className="text-sm font-black text-orange-700 tracking-tight">
                  {formatExpiryTime()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 bg-orange-100 rounded-full overflow-hidden">
                   <div className="h-full bg-orange-500 animate-pulse" style={{ width: '60%' }}></div>
                </div>
                <span className="text-[10px] font-bold text-orange-600">{formatTimeLeft(timeLeft)}</span>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-1.5">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" />
                Expiry Notice
              </p>
              <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                If no one accepts before delivery time, this item moves to <strong>Not Chosen</strong> pool. First photographer to accept wins the assignment.
              </p>
            </div>
          </div>
        </AlertDialogDescription>

        <AlertDialogFooter className="p-6 pt-0 gap-3">
          <AlertDialogCancel 
            onClick={() => onReject(delivery.id)}
            className="flex-1 h-12 rounded-xl border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-gray-50"
          >
            Not Interested
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => onAccept(delivery.id)}
            className="flex-1 h-12 btn-gradient rounded-xl"
          >
            Accept Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

  );
}

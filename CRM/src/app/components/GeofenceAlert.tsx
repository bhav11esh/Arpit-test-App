import React from 'react';
import type { GeofenceBreach, Delivery } from '../types';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { MapPin, Info, X } from 'lucide-react';

interface GeofenceAlertProps {
  breach: GeofenceBreach;
  delivery: Delivery;
  onClose: () => void;
}

export function GeofenceAlert({ breach, delivery, onClose }: GeofenceAlertProps) {
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${meters}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // V1 SPEC: Geofence alert is passive, not alarm-style
  // Single-fire notification logged for admin review
  return (
    <div className="fixed top-20 left-0 right-0 z-50 px-4 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <Card className="border-blue-300 bg-blue-50 shadow-lg">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-blue-900">Location Note</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <p className="text-sm text-blue-800">
                  You are outside the delivery location geofence (500m radius).
                </p>

                <div className="p-3 bg-white border border-blue-200 rounded space-y-1.5">
                  <div className="font-medium text-gray-900 text-sm">{delivery.delivery_name}</div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <MapPin className="h-3 w-3" />
                    <span>{delivery.showroom_code}</span>
                  </div>

                  <div className="text-xs text-gray-600">
                    Distance from location: <span className="font-semibold text-blue-700">{formatDistance(breach.distance_from_target)}</span>
                  </div>
                </div>

                <p className="text-xs text-blue-700">
                  📝 Logged for admin review. No immediate action required.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
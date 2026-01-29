import React, { useState } from 'react';
import type { Delivery, ScreenshotType } from '../types';
import { canSendUpdate } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from './ui/sheet';
import { Link as LinkIcon, Upload, Image as ImageIcon, Send, AlertCircle, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { simulateApiDelay } from '../lib/mockData';

interface SendUpdateSheetProps {
  deliveries: Delivery[];
  screenshots: Map<string, any[]>;
  onClose: () => void;
  onUpdateFootageLink: (deliveryId: string, link: string) => void;
  onUploadScreenshot: (deliveryId: string, type: ScreenshotType, file: File) => void;
  onComplete: (deliveries: Delivery[]) => void;
}

export function SendUpdateSheet({
  deliveries,
  screenshots,
  onClose,
  onUpdateFootageLink,
  onUploadScreenshot,
  onComplete,
}: SendUpdateSheetProps) {
  const [footageLinkInputs, setFootageLinkInputs] = useState<Record<string, string>>({});
  const [editingFootage, setEditingFootage] = useState<string | null>(null);

  // Validate Google Drive URL
  const validateGoogleDriveUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('drive.google.com');
    } catch {
      return false;
    }
  };

  const handleFootageSave = (deliveryId: string) => {
    const link = footageLinkInputs[deliveryId];
    if (!link) {
      toast.error('Please enter a footage link');
      return;
    }
    
    if (!validateGoogleDriveUrl(link)) {
      toast.error('Please enter a valid Google Drive link');
      return;
    }
    
    onUpdateFootageLink(deliveryId, link);
    setEditingFootage(null);
  };

  const handleFileUpload = (deliveryId: string, type: ScreenshotType, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 3MB as per spec)
    const maxSize = 3 * 1024 * 1024; // 3MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 3MB');
      event.target.value = '';
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      event.target.value = '';
      return;
    }

    onUploadScreenshot(deliveryId, type, file);
  };

  const handleSendUpdate = async () => {
    if (!canSendUpdate(deliveries, screenshots)) {
      toast.error('Please complete all required uploads and footage links');
      return;
    }

    await simulateApiDelay(1000);
    
    const updatedDeliveries = deliveries.map(d => ({
      ...d,
      status: 'DONE' as const,
      updated_at: new Date().toISOString(),
    }));

    onComplete(updatedDeliveries);
    toast.success('Update sent! All deliveries marked as done.');
  };

  const canSend = canSendUpdate(deliveries, screenshots);

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle>Send Day Update</SheetTitle>
          <SheetDescription>
            Complete footage links (Google Drive only) and screenshots for all deliveries
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pb-24">
          {deliveries.map(delivery => {
            const deliveryScreenshots = screenshots.get(delivery.id) || [];
            const paymentScreenshot = deliveryScreenshots.find(s => s.type === 'PAYMENT' && !s.deleted_at);
            const followScreenshot = deliveryScreenshots.find(s => s.type === 'FOLLOW' && !s.deleted_at);

            const hasFootage = !!delivery.footage_link;
            const needsPayment = delivery.payment_type === 'CUSTOMER_PAID';
            const hasPayment = !!paymentScreenshot;

            const isComplete = hasFootage && (!needsPayment || hasPayment);

            return (
              <div 
                key={delivery.id} 
                className={`border rounded-lg p-4 space-y-4 ${
                  isComplete ? 'bg-green-50 border-green-200' : 'bg-white'
                }`}
              >
                {/* Delivery Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{delivery.delivery_name}</div>
                    <div className="text-sm text-gray-500">{delivery.showroom_code}</div>
                  </div>
                  {isComplete && (
                    <Badge className="bg-[#16A34A] text-white">
                      <Check className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  )}
                </div>

                {/* Footage Link */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Footage Link (Google Drive only)
                    <span className="text-red-500">*</span>
                  </Label>
                  
                  {editingFootage === delivery.id ? (
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="https://drive.google.com/..."
                        value={footageLinkInputs[delivery.id] || delivery.footage_link || ''}
                        onChange={(e) => setFootageLinkInputs(prev => ({
                          ...prev,
                          [delivery.id]: e.target.value
                        }))}
                        className="flex-1"
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleFootageSave(delivery.id)}
                        className="bg-[#2563EB]"
                      >
                        Apply
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setEditingFootage(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : delivery.footage_link ? (
                    <div className="flex items-center justify-between p-3 border rounded bg-green-50">
                      <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
                        <LinkIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-green-700 truncate">{delivery.footage_link}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setEditingFootage(delivery.id);
                          setFootageLinkInputs(prev => ({
                            ...prev,
                            [delivery.id]: delivery.footage_link || ''
                          }));
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full border-red-200"
                      onClick={() => setEditingFootage(delivery.id)}
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Add Footage Link (Required)
                    </Button>
                  )}
                </div>

                {/* Screenshots for Customer Paid - ONLY shown if CUSTOMER_PAID */}
                {needsPayment && (
                  <div className="space-y-3 pt-3 border-t">
                    <Label>Screenshots</Label>
                    
                    {/* Payment Screenshot */}
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        Payment Screenshot (Max 3MB)
                        <span className="text-red-500">*</span>
                      </div>
                      {paymentScreenshot ? (
                        <div className="flex items-center gap-2 p-3 border rounded bg-green-50">
                          <ImageIcon className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-700 flex-1">Uploaded</span>
                          <img 
                            src={paymentScreenshot.thumbnail_url} 
                            alt="Payment" 
                            className="h-12 w-12 rounded object-cover"
                          />
                        </div>
                      ) : (
                        <label className="block">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(delivery.id, 'PAYMENT', e)}
                            className="hidden"
                          />
                          <Button variant="outline" className="w-full border-red-200" asChild>
                            <span>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Payment (Required)
                            </span>
                          </Button>
                        </label>
                      )}
                    </div>

                    {/* Follow Screenshot */}
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">Follow Screenshot (Optional, Max 3MB)</div>
                      {followScreenshot ? (
                        <div className="flex items-center gap-2 p-3 border rounded bg-green-50">
                          <ImageIcon className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-700 flex-1">Uploaded</span>
                          <img 
                            src={followScreenshot.thumbnail_url} 
                            alt="Follow" 
                            className="h-12 w-12 rounded object-cover"
                          />
                        </div>
                      ) : (
                        <label className="block">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(delivery.id, 'FOLLOW', e)}
                            className="hidden"
                          />
                          <Button variant="outline" className="w-full" asChild>
                            <span>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Follow
                            </span>
                          </Button>
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!canSend && (
            <div className="bg-[#F59E0B]/10 border border-[#F59E0B] rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-800">
                Complete all required fields (marked with *) before sending update.
              </div>
            </div>
          )}
        </div>

        {/* Footer with Send Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
          <Button
            className="w-full h-12 bg-[#2563EB] hover:bg-blue-700 text-white font-medium disabled:bg-[#9CA3AF]"
            disabled={!canSend}
            onClick={handleSendUpdate}
          >
            <Send className="h-4 w-4 mr-2" />
            SEND UPDATE
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
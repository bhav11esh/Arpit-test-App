import React, { useState } from 'react';
import type { Delivery, Screenshot, ScreenshotType } from '../types';
import { canSendUpdate, getShowroomCode } from '../lib/utils';
import { useConfig } from '../context/ConfigContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import {
  ArrowLeft,
  CheckCircle2,
  Upload,
  Link as LinkIcon,
  AlertCircle,
  XCircle,
  Wallet,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface SendUpdateScreenProps {
  deliveries: Delivery[];
  screenshots: Map<string, Screenshot[]>;
  onBack: () => void;
  onUpdateFootageLink: (deliveryId: string, link: string) => void;
  onUpdateDeliveryFields: (deliveryId: string, updates: Partial<Delivery>) => void;
  onUploadScreenshot: (id: string, type: ScreenshotType, file: File) => void;
  onDeleteScreenshot: (id: string, type: ScreenshotType) => void;
  onComplete: (deliveries: Delivery[]) => void;
  userClusterCode?: string;
}

export function SendUpdateScreen({
  deliveries,
  screenshots,
  onBack,
  onUpdateFootageLink,
  onUpdateDeliveryFields,
  onUploadScreenshot,
  onDeleteScreenshot,
  onComplete,
  userClusterCode
}: SendUpdateScreenProps) {
  const { dealerships } = useConfig();
  const [editingFootage, setEditingFootage] = useState<string | null>(null);
  const [tempFootageLink, setTempFootageLink] = useState('');

  const validateGoogleDriveUrl = (url: string): boolean => {
    if (!url) return false;
    // V1 FIX: Relax validation to allow "ONLY PHOTOS" or short status notes
    // We only block if it looks like a URL (http) but ISN'T Google Drive
    const looksLikeUrl = url.toLowerCase().startsWith('http');
    if (looksLikeUrl) {
      return url.includes('drive.google.com') || url.includes('instagram.com/reel');
    }
    // If it's just text (like "ONLY PHOTOS"), allow it as a note
    return true;
  };

  const handleApplyFootageLink = (deliveryId: string) => {
    onUpdateFootageLink(deliveryId, tempFootageLink.trim());
    setEditingFootage(null);
    setTempFootageLink('');
  };

  const handleFileUpload = (id: string, type: ScreenshotType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // V1 SPEC: Screenshot quality constraints
    // - Must be an image file
    // - Max file size: 3MB (automatically enforces reasonable resolution)
    // - Client-side resize allowed to meet size constraint
    // - Date/amount fields must remain readable after any resize
    // - Admin deletion removes screenshot from binary storage permanently

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (10MB max)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size must be less than 10MB (current: ${(file.size / 1024 / 1024).toFixed(1)}MB). If your photo is too large, try taking a standard photo instead of a high-res burst.`);
      return;
    }

    onUploadScreenshot(id, type, file);
  };

  const isDeliveryComplete = (delivery: Delivery): boolean => {
    const link = delivery.footage_link;
    if (!link) return false;

    if (delivery.payment_type === 'CUSTOMER_PAID') {
      const deliveryScreenshots = screenshots.get(delivery.id) || [];
      const hasPayment = deliveryScreenshots.some(s => s.type === 'PAYMENT' && !s.deleted_at);
      const hasPlatformPayment = deliveryScreenshots.some(s => s.type === 'PLATFORM_PAYMENT' && !s.deleted_at);
      const hasAmount = (delivery.received_amount || 0) > 0;
      const hasPhone = (delivery.customer_phone || '').length >= 10;

      // Rapido check
      const charge = delivery.rapido_charge || 0;
      if (charge > 0) {
        const hasRapidoScreenshot = deliveryScreenshots.some(s => s.type === 'RAPIDO' && !s.deleted_at);
        if (!hasRapidoScreenshot) return false;
      }

      return hasPayment && hasPlatformPayment && hasAmount && hasPhone;
    }

    // Rapido check for Dealer Paid too
    const charge = delivery.rapido_charge || 0;
    if (charge > 0) {
      const deliveryScreenshots = screenshots.get(delivery.id) || [];
      const hasRapidoScreenshot = deliveryScreenshots.some(s => s.type === 'RAPIDO' && !s.deleted_at);
      if (!hasRapidoScreenshot) return false;
    }

    return true;
  };

  const allDeliveriesComplete = deliveries.length === 0 || deliveries.every(d => isDeliveryComplete(d));
  const hasDeliveries = deliveries.length > 0;

  // V1 SPEC: Fraud Detection Showroom Cards
  // Calculate unique showrooms covered today
  const uniqueShowroomCodes = Array.from(new Set(deliveries.map(d => d.showroom_code).filter(Boolean)));
  const uniqueShowrooms = uniqueShowroomCodes.length > 0
    ? uniqueShowroomCodes.map(code => {
      const matchingDelivery = deliveries.find(d => d.showroom_code === code);
      let name = code;
      if (matchingDelivery && matchingDelivery.delivery_name.includes('_')) {
        const parts = matchingDelivery.delivery_name.split('_');
        if (parts.length > 1) {
          // Extract name (skip date parts[0])
          name = parts.slice(1).join('_').replace(/_[1-9][0-9]?_[0-9][0-9]?$/, '');
        }
      }
      return { code, name };
    })
    : [{ code: 'GENERAL', name: 'Fraud Detection' }];

  const isFraudDetectionComplete = (showroomCode: string): boolean => {
    const fraudScreenshots = screenshots.get(`showroom_${showroomCode}`) || [];
    return fraudScreenshots.some(s => s.type === 'FRAUD_DETECTION' && !s.deleted_at);
  };

  const allFraudDetectionComplete = uniqueShowrooms.every(s => isFraudDetectionComplete(s.code));

  const totalTasks = (hasDeliveries ? deliveries.length : 0) + uniqueShowrooms.length;
  const completedTasks = (hasDeliveries ? deliveries.filter(isDeliveryComplete).length : 0) + uniqueShowrooms.filter(s => isFraudDetectionComplete(s.code)).length;

  const allTasksComplete = allDeliveriesComplete && allFraudDetectionComplete;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendUpdate = async () => {
    if (isSubmitting) return;

    // V1 SPEC: SEND UPDATE is TRANSACTIONAL - ALL deliveries must meet requirements
    // This is an atomic closeout operation, not a soft submit
    // 1 missing item blocks ENTIRE batch
    const incomplete = deliveries.filter(d => !isDeliveryComplete(d));
    const incompleteFraud = uniqueShowrooms.filter(s => !isFraudDetectionComplete(s.code));

    if (incomplete.length > 0 || incompleteFraud.length > 0) {
      toast.error('Please complete all delivery cards and fraud detection cards before sending update');
      return;
    }

    setIsSubmitting(true);
    try {
      // V1 SPEC: SEND UPDATE is a hard boundary - irreversible day close
      // After this point:
      // - All deliveries marked as DONE
      // - No further edits allowed
      // - Home screen cleared
      // - Corrections require admin ops only
      const updatedDeliveries = deliveries.map(d => {
        let snapshottedRate = d.received_amount;
        if (d.payment_type === 'DEALER_PAID' && (!d.received_amount)) {
          const dealership = dealerships.find(ds => getShowroomCode(ds.name) === d.showroom_code);
          if (dealership) {
            snapshottedRate = dealership.ratePerDelivery || 0;
          }
        }
        return {
          ...d,
          received_amount: snapshottedRate,
          status: 'DONE' as const,
          updated_at: new Date().toISOString()
        };
      });

      await onComplete(updatedDeliveries);
    } catch (error) {
      console.error('Error in handleSendUpdate:', error);
      setIsSubmitting(false);
      toast.error('Failed to send update. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Send Update</h1>
              <p className="text-sm text-gray-500">Final submission for today. This cannot be edited.</p>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-gray-100 rounded-full h-2">
            <div
              className="bg-[#2563EB] h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(completedTasks / totalTasks) * 100}%`
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-gray-600">
              {completedTasks} of {totalTasks} complete
            </span>
            {allTasksComplete && (
              <Badge className="bg-[#16A34A] text-white">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Ready to send
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Deliveries List */}
      <div className="p-4 space-y-4">
        {hasDeliveries ? (
          deliveries.map(delivery => {
            const deliveryScreenshots = screenshots.get(delivery.id) || [];
            const hasFootage = delivery.footage_link;
            const hasPaymentScreenshot = deliveryScreenshots.some(s => s.type === 'PAYMENT' && !s.deleted_at);
            const hasFollowScreenshot = deliveryScreenshots.some(s => s.type === 'FOLLOW' && !s.deleted_at);
            const isComplete = isDeliveryComplete(delivery);
            const isCustomerPaid = delivery.payment_type === 'CUSTOMER_PAID';

            return (
              <Card key={delivery.id} className={`${isComplete ? 'border-[#16A34A] border-2' : 'border-gray-200'}`}>
                <CardContent className="pt-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-semibold text-lg">{delivery.delivery_name}</div>
                      <div className="text-sm text-gray-500">
                        {delivery.showroom_code} • {delivery.timing || 'No timing'}
                      </div>
                    </div>
                    {isComplete && (
                      <Badge className="bg-[#16A34A] text-white">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Complete
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Footage Link */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium flex items-center gap-1">
                          <LinkIcon className="h-4 w-4" />
                          Footage Link
                          <span className="text-red-500">*</span>
                        </Label>
                        {hasFootage ? (
                          <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      {editingFootage === delivery.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={tempFootageLink}
                            onChange={(e) => setTempFootageLink(e.target.value)}
                            placeholder="https://drive.google.com/..."
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleApplyFootageLink(delivery.id)}
                            className="bg-[#16A34A] hover:bg-green-700"
                          >
                            Apply
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingFootage(null);
                              setTempFootageLink('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {hasFootage ? (
                            <div className="flex-1 px-3 py-2 bg-gray-50 rounded border text-sm truncate">
                              {delivery.footage_link}
                            </div>
                          ) : (
                            <div className="flex-1 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-600 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              Footage link required
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingFootage(delivery.id);
                              setTempFootageLink(delivery.footage_link || '');
                            }}
                          >
                            {hasFootage ? 'Edit' : 'Add'}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Payment Screenshot - Only for Customer Paid */}
                    {isCustomerPaid && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Customer Payment Screenshot */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium flex items-center gap-1">
                              <Upload className="h-4 w-4" />
                              Customer Payment
                              <span className="text-red-500">*</span>
                            </Label>
                            {hasPaymentScreenshot ? (
                              <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          {hasPaymentScreenshot ? (
                            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded">
                              <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                              <span className="text-xs text-green-700">Uploaded</span>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded cursor-pointer transition-colors text-xs font-medium">
                              <Upload className="h-3 w-3" />
                              Upload Customer Pay
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(delivery.id, 'PAYMENT', e)}
                              />
                            </label>
                          )}
                        </div>

                        {/* 2. Platform Settlement Screenshot (30%) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium flex items-center gap-1 text-orange-700">
                              <Wallet className="h-4 w-4" />
                              Settlement (30%)
                              <span className="text-red-500">*</span>
                            </Label>
                            {deliveryScreenshots.some(s => s.type === 'PLATFORM_PAYMENT' && !s.deleted_at) ? (
                              <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <div className="bg-orange-50 border border-orange-100 p-2 rounded text-[10px] text-orange-800 font-bold flex justify-between items-center">
                              <span>AMOUNT TO PAY:</span>
                              <span className="text-sm">₹{Math.round((delivery.received_amount || 0) * 0.3)}</span>
                            </div>

                            {deliveryScreenshots.some(s => s.type === 'PLATFORM_PAYMENT' && !s.deleted_at) ? (
                               <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded">
                                 <div className="flex items-center gap-2">
                                   <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                                   <span className="text-xs text-green-700">Settled with Platform</span>
                                 </div>
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                   onClick={() => onDeleteScreenshot(delivery.id, 'PLATFORM_PAYMENT')}
                                 >
                                   <Trash2 className="h-3 w-3" />
                                 </Button>
                               </div>
                            ) : (
                              <label className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded cursor-pointer transition-colors text-xs font-medium">
                                <Upload className="h-3 w-3" />
                                Upload Platform Screenshot
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(delivery.id, 'PLATFORM_PAYMENT', e)}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Amount Received - Only for Customer Paid */}
                    {isCustomerPaid && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium flex items-center gap-1">
                            Amount Received (INR)
                            <span className="text-red-500">*</span>
                          </Label>
                          {(delivery.received_amount || 0) > 0 ? (
                            <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <select
                          className="w-full h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={
                            delivery.received_amount && [2000, 1500, 1200, 700].includes(delivery.received_amount)
                              ? String(delivery.received_amount)
                              : delivery.received_amount !== undefined && delivery.received_amount !== 0
                                ? "other"
                                : ""
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "other") {
                              // Just set it to something it can't match to trigger the input
                              onUpdateDeliveryFields(delivery.id, { received_amount: 0 });
                            } else {
                              onUpdateDeliveryFields(delivery.id, { received_amount: parseInt(val) || 0 });
                            }
                          }}
                        >
                          <option value="">Select Amount</option>
                          <option value="2000">2000 INR</option>
                          <option value="1500">1500 INR</option>
                          <option value="1200">1200 INR</option>
                          <option value="700">700 INR</option>
                          <option value="other">Other (Write Custom)</option>
                        </select>

                        {/* Custom Amount Input */}
                        {(delivery.received_amount === 0 || (delivery.received_amount && ![2000, 1500, 1200, 700].includes(delivery.received_amount))) && (
                          <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                            <Label className="text-[10px] text-gray-500 mb-1 block">Enter Custom Amount (INR)</Label>
                            <Input
                              type="number"
                              placeholder="e.g. 500"
                              className="h-10"
                              value={delivery.received_amount || ''}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                onUpdateDeliveryFields(delivery.id, { received_amount: val });
                              }}
                            />
                          </div>
                        )}

                        {!(delivery.received_amount || 0) && (
                          <p className="text-xs text-red-600">Please select or enter an amount</p>
                        )}
                      </div>
                    )}

                    {/* Customer Phone - Only for Customer Paid */}
                    {isCustomerPaid && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium flex items-center gap-1">
                            Customer Phone Number
                            <span className="text-red-500">*</span>
                          </Label>
                          {(delivery.customer_phone || '').length >= 10 ? (
                            <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <Input
                          type="tel"
                          placeholder="Enter 10-digit phone number"
                          className="w-full h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={delivery.customer_phone || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            onUpdateDeliveryFields(delivery.id, { customer_phone: val });
                          }}
                        />
                        {!(delivery.customer_phone || '').length && (
                          <p className="text-xs text-red-600">Phone number required</p>
                        )}
                      </div>
                    )}

                    {/* Follow Screenshot - Only for Customer Paid, Optional */}
                    {isCustomerPaid && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium flex items-center gap-1">
                            <Upload className="h-4 w-4" />
                            Follow Screenshot
                            <span className="text-gray-400 text-xs ml-1">(Optional)</span>
                          </Label>
                          {hasFollowScreenshot && (
                            <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                          )}
                        </div>
                        {hasFollowScreenshot ? (
                          <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                              <span className="text-sm text-green-700">Screenshot uploaded</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => onDeleteScreenshot(delivery.id, 'FOLLOW')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-gray-50 border-2 border-dashed border-gray-300 rounded cursor-pointer transition-colors">
                            <Upload className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">Upload Follow Screenshot</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload(delivery.id, 'FOLLOW', e)}
                            />
                          </label>
                        )}
                      </div>
                    )}

                    {/* Rapido Charge Section (Visible for Cross-Cluster Deliveries) */}
                    {delivery.showroom_type === 'SECONDARY' && delivery.cluster_code !== userClusterCode && (
                      <div className="pt-4 border-t border-dashed border-gray-200 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-blue-700 flex items-center gap-1">
                            Rapido Charge (Optional)
                            <Badge variant="outline" className="text-[10px] h-4 bg-blue-50 text-blue-600 border-blue-200 ml-1">CROSS-CLUSTER</Badge>
                          </Label>
                          <Input
                            type="number"
                            placeholder="Enter Rapido fare"
                            className="w-full h-10 px-3 bg-white border border-blue-200 rounded-md text-sm focus:ring-blue-500"
                            value={delivery.rapido_charge || ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              onUpdateDeliveryFields(delivery.id, { rapido_charge: val });
                            }}
                          />
                        </div>

                        {/* Rapido Screenshot - Mandatory if charge added */}
                        {(delivery.rapido_charge || 0) > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium flex items-center gap-1">
                                <Upload className="h-4 w-4" />
                                Rapido Screenshot
                                <span className="text-red-500">*</span>
                              </Label>
                              {deliveryScreenshots.some(s => s.type === 'RAPIDO' && !s.deleted_at) ? (
                                <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            {deliveryScreenshots.some(s => s.type === 'RAPIDO' && !s.deleted_at) ? (
                              <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                                  <span className="text-sm text-green-700">Rapido proof uploaded</span>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => onDeleteScreenshot(delivery.id, 'RAPIDO')}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer transition-colors">
                                  <Upload className="h-4 w-4" />
                                  <span className="text-sm font-medium">Upload Rapido Screenshot</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleFileUpload(delivery.id, 'RAPIDO', e)}
                                  />
                                </label>
                                <p className="text-xs text-red-600">Proof is mandatory since you added a charge</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* V1 SPEC: Dealer-paid deliveries - Show clear "no customer interaction" message */}
                    {!isCustomerPaid && (
                      <div className="space-y-4">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-900 font-medium">🏢 Dealer-paid showroom</p>
                          <p className="text-xs text-blue-700 mt-1">No customer interaction required. Only footage link needed.</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium flex items-center gap-1">
                            Custom Amount <span className="text-gray-400 text-xs ml-1">(Special Request Only)</span>
                          </Label>
                          <Input
                            type="number"
                            placeholder="e.g. 5000 (Leave blank for default rate)"
                            className="h-10"
                            value={delivery.received_amount || ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              onUpdateDeliveryFields(delivery.id, { received_amount: val });
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p>No deliveries to update.</p>
          </div>
        )}

        {/* Fraud Detection Cards */}
        <div className="pt-6 border-t border-gray-200">
          <h2 className="text-lg font-bold mb-4 px-1">Fraud Detection Requirements</h2>
          <div className="space-y-4">
            {uniqueShowrooms.map(showroom => {
              const isComplete = isFraudDetectionComplete(showroom.code);
              return (
                <Card key={showroom.code} className={`${isComplete ? 'border-[#16A34A] border-2' : 'border-gray-200 shadow-sm'}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-base">{showroom.name}</div>
                          <div className="text-xs text-blue-600 font-medium tracking-wide uppercase">Fraud Detection Doc</div>
                        </div>
                      </div>
                      {isComplete && (
                        <Badge className="bg-[#16A34A] text-white">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Doc Uploaded
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium flex items-center gap-1">
                            <Upload className="h-4 w-4" />
                            Fraud Detection Signed Doc Photo
                            <span className="text-red-500">*</span>
                          </Label>
                        </div>
                        
                        {isComplete ? (
                          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-[#16A34A]" />
                              <span className="text-sm text-green-700 font-medium">Document verified & uploaded</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => onDeleteScreenshot(showroom.code, 'FRAUD_DETECTION')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <label className="flex flex-col items-center justify-center gap-2 px-4 py-8 bg-white hover:bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer transition-all hover:border-blue-400">
                              <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                                <Upload className="h-6 w-6" />
                              </div>
                              <div className="text-center">
                                <span className="text-sm font-semibold text-gray-900">Upload Doc Photo</span>
                                <p className="text-xs text-gray-500 mt-1">Photo must clearly show the signature</p>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(showroom.code, 'FRAUD_DETECTION', e)}
                              />
                            </label>
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <p className="text-[11px] text-amber-800 leading-tight">
                                This document is mandatory for daily closeout. Ensure the showroom name and date are visible.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Button - V1 SPEC: No confirmation dialog, immediate action */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <Button
          className="w-full h-14 bg-[#16A34A] hover:bg-green-700 text-white font-semibold text-lg shadow-md disabled:bg-gray-300 disabled:text-gray-500"
          disabled={!allTasksComplete || isSubmitting}
          onClick={handleSendUpdate}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              SENDING UPDATE...
            </div>
          ) : allTasksComplete ? (
            <>
              <CheckCircle2 className="h-5 w-5 mr-2" />
              SEND UPDATE & Close Day
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 mr-2" />
              Complete all required items
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

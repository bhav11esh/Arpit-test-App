import React, { useState } from 'react';
import type { Delivery, Screenshot } from '../types';
import { canSendUpdate } from '../lib/utils';
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
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface SendUpdateScreenProps {
  deliveries: Delivery[];
  screenshots: Map<string, Screenshot[]>;
  onBack: () => void;
  onUpdateFootageLink: (deliveryId: string, link: string) => void;
  onUploadScreenshot: (deliveryId: string, type: 'PAYMENT' | 'FOLLOW', file: File) => void;
  onComplete: (deliveries: Delivery[]) => void;
}

export function SendUpdateScreen({
  deliveries,
  screenshots,
  onBack,
  onUpdateFootageLink,
  onUploadScreenshot,
  onComplete
}: SendUpdateScreenProps) {
  const [footageLinks, setFootageLinks] = useState<Map<string, string>>(
    new Map(deliveries.map(d => [d.id, d.footage_link || '']))
  );
  const [editingFootage, setEditingFootage] = useState<string | null>(null);
  const [tempFootageLink, setTempFootageLink] = useState('');

  const validateGoogleDriveUrl = (url: string): boolean => {
    return url.includes('drive.google.com');
  };

  const handleApplyFootageLink = (deliveryId: string) => {
    if (!tempFootageLink.trim()) {
      toast.error('Please enter a footage link');
      return;
    }

    if (!validateGoogleDriveUrl(tempFootageLink)) {
      toast.error('Please use a Google Drive link');
      return;
    }

    onUpdateFootageLink(deliveryId, tempFootageLink);
    setFootageLinks(prev => new Map(prev).set(deliveryId, tempFootageLink));
    setEditingFootage(null);
    setTempFootageLink('');
  };

  const handleFileUpload = (deliveryId: string, type: 'PAYMENT' | 'FOLLOW', e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Validate file size (3MB max)
    // This implicitly ensures reasonable resolution without blocking high-quality captures
    if (file.size > 3 * 1024 * 1024) {
      toast.error('File size must be less than 3MB. Tip: Take a clear screenshot showing date/amount, then compress if needed.');
      return;
    }

    onUploadScreenshot(deliveryId, type, file);
  };

  const isDeliveryComplete = (delivery: Delivery): boolean => {
    const link = footageLinks.get(delivery.id) || delivery.footage_link;
    if (!link) return false;

    if (delivery.payment_type === 'CUSTOMER_PAID') {
      const deliveryScreenshots = screenshots.get(delivery.id) || [];
      const hasPayment = deliveryScreenshots.some(s => s.type === 'PAYMENT' && !s.deleted_at);
      return hasPayment;
    }

    return true;
  };

  const allDeliveriesComplete = deliveries.length === 0 || deliveries.every(d => isDeliveryComplete(d));
  const hasDeliveries = deliveries.length > 0;

  const handleSendUpdate = () => {
    // V1 SPEC: Handle zero deliveries case - allow immediate day closure
    if (deliveries.length === 0) {
      console.log('SendUpdateScreen: Handling zero deliveries, calling onComplete([])');
      toast.success('Day closed successfully! 🎉');
      onComplete([]);
      return;
    }

    // V1 SPEC: SEND UPDATE is TRANSACTIONAL - ALL deliveries must meet requirements
    // This is an atomic closeout operation, not a soft submit
    // 1 missing item blocks ENTIRE batch
    const incomplete = deliveries.filter(d => !isDeliveryComplete(d));
    
    if (incomplete.length > 0) {
      const incompleteNames = incomplete.map(d => d.delivery_name).join(', ');
      toast.error(`Cannot send update: ${incomplete.length} delivery(ies) incomplete: ${incompleteNames}`, {
        duration: 5000,
      });
      return;
    }

    // V1 SPEC: SEND UPDATE is a hard boundary - irreversible day close
    // After this point:
    // - All deliveries marked as DONE
    // - No further edits allowed
    // - Home screen cleared
    // - Corrections require admin ops only
    const updatedDeliveries = deliveries.map(d => ({
      ...d,
      status: 'DONE' as const,
      // Update footage_link from local state if it was edited
      footage_link: footageLinks.get(d.id) || d.footage_link,
      updated_at: new Date().toISOString()
    }));

    toast.success('Day closed successfully! 🎉');
    onComplete(updatedDeliveries);
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
                width: hasDeliveries 
                  ? `${(deliveries.filter(d => isDeliveryComplete(d)).length / deliveries.length) * 100}%`
                  : '100%'
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-gray-600">
              {deliveries.filter(d => isDeliveryComplete(d)).length} of {deliveries.length} complete
            </span>
            {allDeliveriesComplete && (
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
          const hasFootage = footageLinks.get(delivery.id) || delivery.footage_link;
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
                            {footageLinks.get(delivery.id) || delivery.footage_link}
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
                            setTempFootageLink(footageLinks.get(delivery.id) || delivery.footage_link || '');
                          }}
                        >
                          {hasFootage ? 'Edit' : 'Add'}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Payment Screenshot - Only for Customer Paid */}
                  {isCustomerPaid && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium flex items-center gap-1">
                          <Upload className="h-4 w-4" />
                          Payment Screenshot
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
                          <span className="text-sm text-green-700">Screenshot uploaded</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="flex items-center justify-center gap-2 px-4 py-3 bg-[#2563EB] hover:bg-blue-700 text-white rounded cursor-pointer transition-colors">
                            <Upload className="h-4 w-4" />
                            <span className="text-sm font-medium">Upload Payment Screenshot</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload(delivery.id, 'PAYMENT', e)}
                            />
                          </label>
                          <p className="text-xs text-red-600">Required for customer-paid deliveries</p>
                        </div>
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
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded">
                          <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                          <span className="text-sm text-green-700">Screenshot uploaded</span>
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

                  {/* V1 SPEC: Dealer-paid deliveries - Show clear "no customer interaction" message */}
                  {!isCustomerPaid && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900 font-medium">📦 Dealer-paid showroom</p>
                      <p className="text-xs text-blue-700 mt-1">No customer interaction required. Only footage link needed.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
        ) : (
          <div className="text-center text-gray-500">
            <p>No deliveries to update.</p>
          </div>
        )}
      </div>

      {/* Fixed Bottom Button - V1 SPEC: No confirmation dialog, immediate action */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <Button
          className="w-full h-14 bg-[#16A34A] hover:bg-green-700 text-white font-semibold text-lg shadow-md disabled:bg-gray-300 disabled:text-gray-500"
          disabled={!allDeliveriesComplete}
          onClick={handleSendUpdate}
        >
          {allDeliveriesComplete ? (
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
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Delivery } from '../types';
import { mockDeliveries, mockScreenshots, simulateApiDelay } from '../lib/mockData';
import { shouldShowAcceptRejectPrompt, isPromptExpired, canSendUpdate, getStatusColor, formatTiming, generateDeliveryName, getClusterShortCode } from '../lib/utils';
import { DeliveryCard } from './DeliveryCard';
import { AcceptRejectDialog } from './AcceptRejectDialog';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Send, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function PhotographerHome() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [screenshots, setScreenshots] = useState<Map<string, any[]>>(new Map());
  const [pendingPrompt, setPendingPrompt] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [dayClosed, setDayClosed] = useState(false); // V1 FIX: Track day closure state

  // Load data
  useEffect(() => {
    loadData();
  }, [user]);

  // V1 SPEC: Time-based Accept/Reject prompt scheduler
  // Checks every 30 seconds for deliveries that should show prompt
  // V1 RULE: Prompt appears ONLY 30 minutes before delivery time and ONLY for deliveries with timing
  useEffect(() => {
    if (!user) return;

    const checkForPrompts = () => {
      // Find all PENDING deliveries in user's cluster that should show prompt
      // V1 SPEC: Only SECONDARY deliveries should show Accept/Reject prompts automatically
      const eligibleDeliveries = mockDeliveries.filter(delivery =>
        delivery.showroom_type === 'SECONDARY' &&
        shouldShowAcceptRejectPrompt(delivery, user.cluster_code)
      );

      // Show first eligible delivery if any (one at a time)
      if (eligibleDeliveries.length > 0 && !pendingPrompt) {
        setPendingPrompt(eligibleDeliveries[0]);
      }

      // Auto-reject if prompt has expired
      if (pendingPrompt && isPromptExpired(pendingPrompt)) {
        handleDeliveryExpiry(pendingPrompt.id);
      }
    };

    // Initial check
    checkForPrompts();

    // Check every 30 seconds
    const interval = setInterval(checkForPrompts, 30000);

    return () => clearInterval(interval);
  }, [user, pendingPrompt]);

  const loadData = async () => {
    setLoading(true);
    await simulateApiDelay();

    // Filter deliveries for current user
    const userDeliveries = mockDeliveries.filter(
      d => d.assigned_user_id === user?.id
    );

    setDeliveries(userDeliveries);

    // Group screenshots by delivery
    const screenshotMap = new Map<string, any[]>();
    mockScreenshots.forEach(screenshot => {
      const existing = screenshotMap.get(screenshot.delivery_id) || [];
      screenshotMap.set(screenshot.delivery_id, [...existing, screenshot]);
    });
    setScreenshots(screenshotMap);

    setLoading(false);
  };

  const handleAccept = async (deliveryId: string) => {
    await simulateApiDelay(300);

    // Update delivery status
    setDeliveries(prev => prev.map(d =>
      d.id === deliveryId
        ? { ...d, status: 'ASSIGNED', assigned_user_id: user?.id || null }
        : d
    ));

    // Add to user's deliveries if not already there
    const acceptedDelivery = mockDeliveries.find(d => d.id === deliveryId);
    if (acceptedDelivery) {
      setDeliveries(prev => {
        const exists = prev.find(d => d.id === deliveryId);
        if (exists) return prev;
        return [...prev, { ...acceptedDelivery, status: 'ASSIGNED', assigned_user_id: user?.id || null }];
      });
    }

    setPendingPrompt(null);
    toast.success('Delivery accepted successfully');
  };

  const handleReject = async (deliveryId: string) => {
    // V1 CRITICAL FIX: Single photographer rejection does NOT move delivery immediately
    // Delivery remains in its current section (PENDING) until:
    // - All photographers have rejected OR
    // - Delivery time expires with no acceptance
    // Only then does system mark it as REJECTED and move to Not Chosen
    await simulateApiDelay(300);

    // In production: would record this user's rejection in a separate table
    // but NOT change delivery status to REJECTED yet
    // For now, just close the prompt - delivery stays PENDING

    setPendingPrompt(null);
    toast.info('Delivery declined (still available to others in your cluster)');
  };

  // V1 FIX: Handle delivery-level expiry (not per-user auto-reject)
  // When delivery time is reached with no acceptance → "Rejected by all" → moves to Not Chosen
  const handleDeliveryExpiry = async (deliveryId: string) => {
    await simulateApiDelay(300);

    // Close the prompt - system will check if anyone accepted
    // If not, delivery moves to "Not Chosen" with status REJECTED
    setPendingPrompt(null);

    toast.info('Delivery time reached - prompt expired');
  };

  const handleUpdateTiming = async (deliveryId: string, timing: string) => {
    await simulateApiDelay(300);

    setDeliveries(prev => prev.map(d => {
      if (d.id === deliveryId) {
        // V1 SPEC: Use centralized name generation
        const newName = generateDeliveryName(d.date, d.showroom_code, getClusterShortCode(d.cluster_code), timing);
        // V1 RULE: Timing update re-triggers Accept/Reject prompt scheduling (30 min before)
        // The useEffect hooks above automatically re-schedule when deliveries array updates
        return { ...d, timing, delivery_name: newName, updated_at: new Date().toISOString() };
      }
      return d;
    }));

    toast.success('Timing updated');
  };

  const handleUpdateFootageLink = async (deliveryId: string, link: string) => {
    await simulateApiDelay(300);

    setDeliveries(prev => prev.map(d =>
      d.id === deliveryId
        ? { ...d, footage_link: link, updated_at: new Date().toISOString() }
        : d
    ));

    toast.success('Footage link updated');
  };

  const handleSendUpdate = async () => {
    // Check if ALL assigned deliveries are ready
    const allReady = assignedDeliveries.length > 0 && assignedDeliveries.every(d => canSendUpdate(d, screenshots.get(d.id) || []));

    if (!allReady) {
      toast.error('Cannot send update. Ensure all deliveries have footage links and payment screenshots.');
      return;
    }

    setLoading(true);
    await simulateApiDelay(1000);

    // V1 FIX: SEND UPDATE clears everything - no deliveries remain visible
    // Mark all assigned deliveries as DONE and clear from view
    setDeliveries([]); // V1 RULE: Clear Home UI completely after SEND UPDATE

    setLoading(false);
    setDayClosed(true); // V1 FIX: Mark day as closed
    toast.success('Day closeout completed! Home UI cleared. Check Reel Backlog for pending tasks.');
  };

  // Filter deliveries
  const assignedDeliveries = deliveries.filter(d => d.status === 'ASSIGNED');
  const doneDeliveries = deliveries.filter(d => d.status === 'DONE');

  const sendUpdateEnabled = assignedDeliveries.length > 0 && assignedDeliveries.every(d => canSendUpdate(d, screenshots.get(d.id) || []));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading deliveries...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Accept/Reject Dialog */}
      {pendingPrompt && (
        <AcceptRejectDialog
          delivery={pendingPrompt}
          onAccept={handleAccept}
          onReject={handleReject}
          onClose={() => setPendingPrompt(null)}
          onExpiry={handleDeliveryExpiry}
        />
      )}

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Summary</CardTitle>
          <CardDescription>Your assigned deliveries for today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="text-2xl font-bold">{assignedDeliveries.length}</div>
              <div className="text-sm text-gray-500">Active Deliveries</div>
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold">{doneDeliveries.length}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Deliveries */}
      {assignedDeliveries.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Active Deliveries</h2>
            {/* V1 FIX: Hide SEND UPDATE button after day is closed */}
            {!dayClosed && (
              <Button
                onClick={handleSendUpdate}
                disabled={!sendUpdateEnabled}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Send Update
              </Button>
            )}
          </div>

          {!sendUpdateEnabled && !dayClosed && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                Complete all footage links and payment screenshots before sending update.
              </div>
            </div>
          )}

          {/* V1 FIX: Show day closed message */}
          {dayClosed && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800">
                <strong>Day closed.</strong> SEND UPDATE has been completed. No further actions available.
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {assignedDeliveries.map(delivery => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                screenshots={screenshots.get(delivery.id) || []}
                onUpdateTiming={dayClosed ? undefined : handleUpdateTiming}
                onUpdateFootageLink={dayClosed ? undefined : handleUpdateFootageLink}
                dayCompleted={dayClosed}
                onUploadScreenshot={(deliveryId, type, file) => {
                  // Simulate upload
                  const newScreenshot = {
                    id: `s${Date.now()}`,
                    delivery_id: deliveryId,
                    user_id: user?.id || '',
                    type,
                    file_url: URL.createObjectURL(file),
                    thumbnail_url: URL.createObjectURL(file),
                    uploaded_at: new Date().toISOString(),
                    deleted_at: null,
                  };

                  // V1 FIX: Save to mockScreenshots for persistence across logout
                  mockScreenshots.push(newScreenshot);

                  setScreenshots(prev => {
                    const newMap = new Map(prev);
                    const existing = newMap.get(deliveryId) || [];
                    newMap.set(deliveryId, [...existing, newScreenshot]);
                    return newMap;
                  });

                  toast.success('Screenshot uploaded');
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Deliveries */}
      {doneDeliveries.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Completed Deliveries</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {doneDeliveries.map(delivery => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                screenshots={screenshots.get(delivery.id) || []}
                readonly
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {assignedDeliveries.length === 0 && doneDeliveries.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No deliveries assigned yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

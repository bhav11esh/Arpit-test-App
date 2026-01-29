import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Delivery, GeofenceBreach, PhotographerDayState } from '../types';
import { mockDeliveries, mockScreenshots, mockReelTasks, simulateApiDelay, photographerDayStates, mockMappings, mockDealerships, mockClusters } from '../lib/mockData';
import { DeliveryCard } from './DeliveryCard';
import { AcceptRejectDialog } from './AcceptRejectDialog';
import { SendUpdateScreen } from './SendUpdateScreen';
import { GeofenceAlert } from './GeofenceAlert';
import { TimingPrompt } from './TimingPrompt';
import { scheduleGeofenceCheck } from '../lib/geofence';
import { createLogEvent } from '../lib/logging';
import { shouldShowAcceptRejectPrompt, isPromptExpired, generateDeliveryName, canSelfAssign } from '../lib/utils';
import { 
  shouldShowTimingPrompt, 
  dismissPrompt, 
  finalizeShowroom, 
  getNextCreationIndex,
  initializePromptState
} from '../lib/timingPrompt';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Calendar, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'sonner';

export function HomeScreen() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [screenshots, setScreenshots] = useState<Map<string, any[]>>(new Map());
  const [pendingPrompt, setPendingPrompt] = useState<Delivery | null>(null);
  const [showSendUpdate, setShowSendUpdate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [geofenceBreach, setGeofenceBreach] = useState<{ breach: GeofenceBreach; delivery: Delivery } | null>(null);
  
  // V1 SPEC: Track deliveries serviced today (included in SEND UPDATE batch)
  const [servicedCount, setServicedCount] = useState(0);
  
  // V1 CRITICAL: Photographer day state - ACTIVE or CLOSED
  // CLOSED = SEND UPDATE triggered - no further edits/uploads/assignments allowed
  const [photographerDayState, setPhotographerDayState] = useState<PhotographerDayState>('ACTIVE');
  
  // Two-step button flow: "Deliveries Finished?" → "Send Update?"
  const [deliveriesFinishedClicked, setDeliveriesFinishedClicked] = useState(false);

  // V1 TIMING PROMPT: State for hourly timing input flow
  const [showTimingPrompt, setShowTimingPrompt] = useState(false);
  const [currentShowroomPrompt, setCurrentShowroomPrompt] = useState<{
    showroomCode: string;
    showroomName: string;
    clusterCode: string;
    paymentType: 'CUSTOMER_PAID' | 'DEALER_PAID';
    showroomType: 'PRIMARY' | 'SECONDARY';
  } | null>(null);

  useEffect(() => {
    loadData();
    
    // V1 CRITICAL: Load persisted photographer day state on mount
    if (user?.id && photographerDayStates[user.id]) {
      setServicedCount(photographerDayStates[user.id].servicedCount);
      setPhotographerDayState(photographerDayStates[user.id].dayState);
    }
  }, [user]);

  // V1 CRITICAL: Poll for changes in shared mockDeliveries every 5 seconds
  // This allows photographers to see when others accept/reject/unassign deliveries
  useEffect(() => {
    if (!user) return;

    const pollInterval = setInterval(() => {
      // Only reload without showing loading state
      const userDeliveries = mockDeliveries.filter(d => {
        // EXCLUDE DONE deliveries (day already closed for these)
        if (d.status === 'DONE') {
          return false;
        }
        
        // EXCLUDE deliveries assigned to someone else
        if (d.status === 'ASSIGNED' && d.assigned_user_id !== user?.id) {
          return false;
        }
        
        // Always show deliveries assigned to current user
        if (d.assigned_user_id === user?.id) return true;
        
        // Show UNASSIGNED PRIMARY deliveries (stays in primary photographer's view until reassigned)
        if (d.status === 'UNASSIGNED' && d.showroom_type === 'PRIMARY' && d.cluster_code === user?.cluster_code) {
          return true;
        }
        
        // Show UNASSIGNED SECONDARY deliveries from same cluster (available to all cluster photographers)
        if (d.status === 'UNASSIGNED' && d.showroom_type === 'SECONDARY' && d.cluster_code === user?.cluster_code) {
          return true;
        }
        
        return false;
      });

      // Only update if data actually changed
      const hasChanged = JSON.stringify(deliveries) !== JSON.stringify(userDeliveries);
      if (hasChanged) {
        setDeliveries(userDeliveries);
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(pollInterval);
  }, [user, deliveries]);

  // Schedule geofence checks for assigned deliveries with timing
  useEffect(() => {
    if (!user) return;

    const cleanupFunctions: Array<(() => void) | null> = [];

    deliveries.forEach(delivery => {
      if (
        delivery.status === 'ASSIGNED' &&
        delivery.assigned_user_id === user.id &&
        delivery.timing
      ) {
        const cleanup = scheduleGeofenceCheck(
          delivery,
          user.id,
          (breach) => {
            setGeofenceBreach({ breach, delivery });
            // Log breach
            createLogEvent(
              'GEOFENCE_BREACH',
              user.id,
              delivery.id,
              {
                latitude: breach.latitude,
                longitude: breach.longitude,
                distance_from_target: breach.distance_from_target,
                breach_time: breach.breach_time,
              }
            );
          }
        );
        
        if (cleanup) {
          cleanupFunctions.push(cleanup);
        }
      }
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup?.());
    };
  }, [deliveries, user]);

  // V1 SPEC: Time-based Accept/Reject prompt scheduler
  // Checks every 30 seconds for deliveries that should show prompt
  // V1 RULE: PRIMARY deliveries are assigned by default - only enter Accept/Reject if explicitly unassigned
  // SECONDARY deliveries use Accept/Reject flow for assignment
  useEffect(() => {
    if (!user) return;

    const checkForPrompts = () => {
      // Find all UNASSIGNED deliveries in user's cluster that should show prompt
      // V1 CRITICAL: UNASSIGNED deliveries (from other photographers) should also trigger Accept/Reject
      // SECONDARY deliveries use Accept/Reject flow for assignment
      const eligibleDeliveries = mockDeliveries.filter(delivery => 
        (delivery.showroom_type === 'SECONDARY' || delivery.status === 'UNASSIGNED') &&
        shouldShowAcceptRejectPrompt(delivery, user.cluster_code) &&
        delivery.status !== 'ASSIGNED' // Exclude if someone already accepted it
      );

      // V1 CRITICAL: Close prompt if current delivery is no longer eligible (someone else accepted it)
      if (pendingPrompt) {
        const stillEligible = eligibleDeliveries.find(d => d.id === pendingPrompt.id);
        if (!stillEligible) {
          setPendingPrompt(null);
        }
      }

      // Show first eligible delivery if any (one at a time)
      if (eligibleDeliveries.length > 0 && !pendingPrompt) {
        setPendingPrompt(eligibleDeliveries[0]);
      }

      // V1 CRITICAL FIX: Terminal state transition for rejected-by-all
      // When delivery time is reached and no one has accepted:
      // - Auto-mark all remaining PENDING deliveries as REJECTED (rejected-by-all)
      // - This is a terminal state transition, not just UI cleanup
      // - Delivery moves to "Not Chosen Deliveries" permanently
      if (pendingPrompt && isPromptExpired(pendingPrompt)) {
        handleAutoReject(pendingPrompt.id);
      }
      
      // V1 SPEC: Also check for ANY unassigned deliveries that have passed delivery time without acceptance
      // These must be marked as rejected-by-all even if they never had a prompt shown
      mockDeliveries.forEach(delivery => {
        if (
          delivery.status === 'UNASSIGNED' &&
          delivery.timing &&
          isPromptExpired(delivery) &&
          !delivery.rejected_by_all
        ) {
          // Terminal state: delivery time passed with no acceptance
          handleAutoReject(delivery.id);
        }
      });
    };

    // Initial check
    checkForPrompts();

    // Check every 30 seconds
    const interval = setInterval(checkForPrompts, 30000);

    return () => clearInterval(interval);
  }, [user, pendingPrompt]);

  // V1 TIMING PROMPT: Hourly checker for showrooms needing timing input
  // Starts at 9:00 AM, repeats every 1 hour
  // Stops when all deliveries for showroom are finalized (have timing)
  useEffect(() => {
    if (!user || photographerDayState === 'CLOSED') return;

    const checkForTimingPrompts = () => {
      const currentHour = new Date().getHours();
      
      // Only show prompts after 9 AM
      if (currentHour < 9) return;

      const today = new Date().toISOString().split('T')[0];

      // Get all showrooms assigned to this photographer
      const photographerMappings = mockMappings.filter(m => {
        // PRIMARY: directly assigned
        if (m.mappingType === 'PRIMARY' && m.photographerId === user.id) {
          return true;
        }
        // SECONDARY: eligible if in same cluster
        if (m.mappingType === 'SECONDARY') {
          const cluster = mockClusters.find(c => c.id === m.clusterId);
          const userClusterName = mockClusters.find(c => c.name === user.cluster_code)?.id;
          return m.clusterId === userClusterName;
        }
        return false;
      });

      // Check each showroom for timing prompt need
      for (const mapping of photographerMappings) {
        const showroomDeliveries = mockDeliveries.filter(
          d => d.showroom_code === mapping.dealershipId && d.date === today
        );

        // Check if this showroom needs timing input
        if (shouldShowTimingPrompt(mapping.dealershipId, today, showroomDeliveries)) {
          // Show timing prompt for this showroom
          const dealership = mockDealerships.find(d => d.id === mapping.dealershipId);
          const cluster = mockClusters.find(c => c.id === mapping.clusterId);
          
          if (dealership && cluster) {
            // Extract showroom code from dealership name (e.g., "Khatri Wheels (KHTR_WH)" -> "KHTR_WH")
            const showroomCode = dealership.name.match(/\(([^)]+)\)/)?.[1] || mapping.dealershipId;
            
            setCurrentShowroomPrompt({
              showroomCode: showroomCode,
              showroomName: dealership.name,
              clusterCode: cluster.name,
              paymentType: dealership.paymentType,
              showroomType: mapping.mappingType,
            });
            setShowTimingPrompt(true);
            break; // Show one prompt at a time
          }
        }
      }
    };

    // Initial check
    checkForTimingPrompts();

    // Check every hour (3600000 ms)
    const interval = setInterval(checkForTimingPrompts, 3600000);

    return () => clearInterval(interval);
  }, [user, photographerDayState, mockDeliveries]);

  const loadData = async () => {
    // V1 CRITICAL: Load deliveries based on cluster visibility rules
    // - Show deliveries ASSIGNED to current user
    // - Show UNASSIGNED deliveries from same cluster (for ALL photographers including unassigner)
    // - EXCLUDE deliveries ASSIGNED to OTHER photographers (they accepted/claimed it)
    // - EXCLUDE DONE deliveries (day already closed for these)
    
    setLoading(true);
    await simulateApiDelay();
    
    console.log('loadData: mockDeliveries BEFORE filter:', mockDeliveries.map(d => ({ id: d.id, status: d.status, name: d.delivery_name })));
    
    const userDeliveries = mockDeliveries.filter(d => {
      // EXCLUDE DONE deliveries (day already closed for these)
      if (d.status === 'DONE') {
        console.log('loadData: Excluding DONE delivery:', d.delivery_name);
        return false;
      }
      
      // EXCLUDE deliveries assigned to someone else
      if (d.status === 'ASSIGNED' && d.assigned_user_id !== user?.id) {
        return false;
      }
      
      // Always show deliveries assigned to current user (but not DONE)
      if (d.assigned_user_id === user?.id) return true;
      
      // Show UNASSIGNED PRIMARY deliveries (stays in primary photographer's view until reassigned)
      if (d.status === 'UNASSIGNED' && d.showroom_type === 'PRIMARY' && d.cluster_code === user?.cluster_code) {
        return true;
      }
      
      // Show UNASSIGNED SECONDARY deliveries from same cluster (available to all cluster photographers)
      if (d.status === 'UNASSIGNED' && d.showroom_type === 'SECONDARY' && d.cluster_code === user?.cluster_code) {
        return true;
      }
      
      return false;
    });
    
    console.log('loadData: userDeliveries AFTER filter:', userDeliveries.map(d => ({ id: d.id, status: d.status, name: d.delivery_name })));
    
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
    
    // V1 CRITICAL: Update mockDeliveries directly so other photographers see the change
    const deliveryIndex = mockDeliveries.findIndex(d => d.id === deliveryId);
    if (deliveryIndex !== -1) {
      mockDeliveries[deliveryIndex] = {
        ...mockDeliveries[deliveryIndex],
        status: 'ASSIGNED',
        assigned_user_id: user?.id || null,
        updated_at: new Date().toISOString()
      };
    }
    
    // Update local state
    const acceptedDelivery = mockDeliveries.find(d => d.id === deliveryId);
    if (acceptedDelivery) {
      setDeliveries(prev => {
        const exists = prev.find(d => d.id === deliveryId);
        if (exists) {
          return prev.map(d => 
            d.id === deliveryId 
              ? { ...d, status: 'ASSIGNED', assigned_user_id: user?.id || null, updated_at: new Date().toISOString() }
              : d
          );
        }
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

  const handleAutoReject = async (deliveryId: string) => {
    // V1 SPEC: Auto-reject = "REJECTED_BY_ALL"
    // Represents delivery time expiring with no accept from any photographer
    // This is a TERMINAL STATE TRANSITION, not just UI cleanup
    // Delivery moves permanently to "Not Chosen Deliveries"
    await simulateApiDelay(300);
    
    // V1 CRITICAL: Mark delivery as REJECTED with rejected_by_all flag
    // This distinguishes "rejected by all at expiry" from "single-user rejection"
    setDeliveries(prev => prev.map(d => 
      d.id === deliveryId 
        ? { 
            ...d, 
            status: 'REJECTED' as const, 
            rejected_by_all: true,
            rejected_by_all_timestamp: new Date().toISOString(),
            updated_at: new Date().toISOString() 
          }
        : d
    ));
    
    setPendingPrompt(null);
    toast.info('Delivery moved to Not Chosen (no acceptance by delivery time)');
  };

  const handleUpdateTiming = async (deliveryId: string, timing: string) => {
    await simulateApiDelay(300);
    
    // V1 SPEC: Clear active prompt if this delivery had a prompt showing
    if (pendingPrompt?.id === deliveryId) {
      setPendingPrompt(null);
    }
    
    setDeliveries(prev => prev.map(d => {
      if (d.id === deliveryId) {
        // V1 SPEC: Use centralized name generation
        const newName = generateDeliveryName(d.date, d.showroom_code, timing);
        // V1 RULE: Timing update re-triggers Accept/Reject prompt scheduling (30 min before)
        // and geofence check scheduling (15 min before)
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

  const handleUnassign = async (deliveryId: string) => {
    await simulateApiDelay(300);
    
    // V1 CRITICAL: Update mockDeliveries directly so other photographers see the change
    const deliveryIndex = mockDeliveries.findIndex(d => d.id === deliveryId);
    if (deliveryIndex !== -1) {
      mockDeliveries[deliveryIndex] = {
        ...mockDeliveries[deliveryIndex],
        status: 'UNASSIGNED',
        assigned_user_id: null,
        timing: '',
        footage_link: '',
        unassignment_by: user?.id || '',
        unassignment_timestamp: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    
    // Clear all delivery data and reset to UNASSIGNED
    setDeliveries(prev => prev.map(d => 
      d.id === deliveryId 
        ? { 
            ...d, 
            status: 'UNASSIGNED',
            assigned_user_id: null,
            timing: '',
            footage_link: '',
            unassignment_by: user?.id || '',
            unassignment_timestamp: new Date().toISOString(),
            updated_at: new Date().toISOString() 
          }
        : d
    ));
    
    // Clear screenshots for this delivery
    setScreenshots(prev => {
      const newMap = new Map(prev);
      newMap.delete(deliveryId);
      return newMap;
    });
    
    // V1 CRITICAL: Also clear from mockScreenshots
    const screenshotIndicesToRemove: number[] = [];
    mockScreenshots.forEach((screenshot, index) => {
      if (screenshot.delivery_id === deliveryId) {
        screenshotIndicesToRemove.push(index);
      }
    });
    // Remove in reverse order to maintain indices
    screenshotIndicesToRemove.reverse().forEach(index => {
      mockScreenshots.splice(index, 1);
    });
    
    toast.success('Delivery unassigned successfully');
  };

  const handleAssignSelf = async (deliveryId: string) => {
    await simulateApiDelay(300);
    
    // V1 CRITICAL: Update mockDeliveries directly so other photographers see the change
    const deliveryIndex = mockDeliveries.findIndex(d => d.id === deliveryId);
    if (deliveryIndex !== -1) {
      mockDeliveries[deliveryIndex] = {
        ...mockDeliveries[deliveryIndex],
        status: 'ASSIGNED',
        assigned_user_id: user?.id || null,
        updated_at: new Date().toISOString()
      };
    }
    
    // Update local state
    setDeliveries(prev => prev.map(d => 
      d.id === deliveryId 
        ? { 
            ...d, 
            status: 'ASSIGNED',
            assigned_user_id: user?.id || null,
            updated_at: new Date().toISOString() 
          }
        : d
    ));
    
    toast.success('Delivery assigned to you successfully');
  };

  const handlePostponedCanceled = async (deliveryId: string) => {
    await simulateApiDelay(300);
    
    // V1 CRITICAL: Update mockDeliveries directly so other photographers see the change
    const deliveryIndex = mockDeliveries.findIndex(d => d.id === deliveryId);
    if (deliveryIndex !== -1) {
      mockDeliveries[deliveryIndex] = {
        ...mockDeliveries[deliveryIndex],
        status: 'POSTPONED_CANCELED',
        updated_at: new Date().toISOString(),
      };
    }

    // Update local state
    setDeliveries(prev => prev.map(d => 
      d.id === deliveryId 
        ? { 
            ...d, 
            status: 'POSTPONED_CANCELED',
            updated_at: new Date().toISOString(),
          } 
        : d
    ));

    toast.success('Delivery marked as Postponed/Canceled');
  };

  const handleRejectedByCustomer = async (deliveryId: string) => {
    await simulateApiDelay(300);
    
    // V1 CRITICAL: Update mockDeliveries directly so other photographers see the change
    const deliveryIndex = mockDeliveries.findIndex(d => d.id === deliveryId);
    if (deliveryIndex !== -1) {
      mockDeliveries[deliveryIndex] = {
        ...mockDeliveries[deliveryIndex],
        status: 'REJECTED_CUSTOMER',
        updated_at: new Date().toISOString(),
      };
    }

    // Update local state
    setDeliveries(prev => prev.map(d => 
      d.id === deliveryId 
        ? { 
            ...d, 
            status: 'REJECTED_CUSTOMER',
            updated_at: new Date().toISOString(),
          } 
        : d
    ));

    toast.success('Delivery marked as Rejected by Customer');
  };

  const handleUploadScreenshot = (deliveryId: string, type: any, file: File) => {
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
  };

  // V1 TIMING PROMPT: Handler functions for delivery creation/deletion/timing
  
  const handleAddDelivery = async (timing: string | null) => {
    if (!currentShowroomPrompt || !user) return;

    await simulateApiDelay(300);

    const today = new Date().toISOString().split('T')[0];
    const showroomDeliveries = mockDeliveries.filter(
      d => d.showroom_code === currentShowroomPrompt.showroomCode && d.date === today
    );

    // Get next creation index
    const creationIndex = getNextCreationIndex(
      currentShowroomPrompt.showroomCode,
      today,
      showroomDeliveries
    );

    // Generate delivery name based on whether timing is provided
    const deliveryName = timing
      ? generateDeliveryName(today, currentShowroomPrompt.showroomCode, timing)
      : generateDeliveryName(today, currentShowroomPrompt.showroomCode, null, creationIndex);

    // V1 SPEC: Create new delivery object
    // - For PRIMARY showrooms: auto-assign to photographer
    // - For SECONDARY showrooms: leave UNASSIGNED (accept/reject flow)
    const newDelivery: Delivery = {
      id: `d${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: today,
      showroom_code: currentShowroomPrompt.showroomCode,
      cluster_code: currentShowroomPrompt.clusterCode,
      showroom_type: currentShowroomPrompt.showroomType,
      timing: timing,
      delivery_name: deliveryName,
      status: currentShowroomPrompt.showroomType === 'PRIMARY' ? 'ASSIGNED' : 'UNASSIGNED',
      assigned_user_id: currentShowroomPrompt.showroomType === 'PRIMARY' ? user.id : null,
      payment_type: currentShowroomPrompt.paymentType,
      footage_link: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      creation_index: creationIndex,
    };

    // V1 CRITICAL: Add to mockDeliveries for persistence
    mockDeliveries.push(newDelivery);

    // Update local state
    setDeliveries(prev => [...prev, newDelivery]);

    toast.success(
      timing 
        ? `Delivery created with timing ${timing}` 
        : 'Delivery created without timing (can update later)'
    );
  };

  const handleDeleteDelivery = async (deliveryId: string) => {
    await simulateApiDelay(300);

    // V1 CRITICAL: Remove from mockDeliveries
    const deliveryIndex = mockDeliveries.findIndex(d => d.id === deliveryId);
    if (deliveryIndex !== -1) {
      mockDeliveries.splice(deliveryIndex, 1);
    }

    // Update local state
    setDeliveries(prev => prev.filter(d => d.id !== deliveryId));

    // Clear screenshots for this delivery
    setScreenshots(prev => {
      const newMap = new Map(prev);
      newMap.delete(deliveryId);
      return newMap;
    });

    // V1 CRITICAL: Also clear from mockScreenshots
    const screenshotIndicesToRemove: number[] = [];
    mockScreenshots.forEach((screenshot, index) => {
      if (screenshot.delivery_id === deliveryId) {
        screenshotIndicesToRemove.push(index);
      }
    });
    screenshotIndicesToRemove.reverse().forEach(index => {
      mockScreenshots.splice(index, 1);
    });

    toast.success('Delivery deleted');
  };

  const handleUpdateDeliveryTiming = async (deliveryId: string, timing: string) => {
    await simulateApiDelay(300);

    // Find the delivery
    const deliveryIndex = mockDeliveries.findIndex(d => d.id === deliveryId);
    if (deliveryIndex !== -1) {
      const delivery = mockDeliveries[deliveryIndex];
      
      // Generate new name with timing
      const newName = generateDeliveryName(delivery.date, delivery.showroom_code, timing);

      // Update in mockDeliveries
      mockDeliveries[deliveryIndex] = {
        ...delivery,
        timing,
        delivery_name: newName,
        updated_at: new Date().toISOString(),
      };

      // Update local state
      setDeliveries(prev => prev.map(d => 
        d.id === deliveryId
          ? { ...d, timing, delivery_name: newName, updated_at: new Date().toISOString() }
          : d
      ));

      toast.success('Delivery timing updated');
    }
  };

  const handleDismissTimingPrompt = () => {
    if (!currentShowroomPrompt) return;

    const today = new Date().toISOString().split('T')[0];
    
    // Mark prompt as dismissed (will reappear in 1 hour)
    dismissPrompt(currentShowroomPrompt.showroomCode, today);

    setShowTimingPrompt(false);
    setCurrentShowroomPrompt(null);

    toast.info('Timing prompt dismissed. It will reappear in 1 hour.');
  };

  // V1 SPEC: Categorize deliveries into 3 explicit sections
  // 
  // PRIMARY SHOWROOM DELIVERIES:
  // - showroom_type='PRIMARY' AND status='ASSIGNED' to this photographer
  // - V1 CRITICAL: PRIMARY/SECONDARY is DATE-SPECIFIC, not static ownership
  // - A showroom may be PRIMARY today and SECONDARY tomorrow (e.g., if photographer on leave)
  // - These are assigned by default (no accept/reject)
  // - V1 FIX: Unassigned primary deliveries STAY in Primary section until someone else assigns it
  // - Once ASSIGNED to another photographer, it disappears from original photographer's view
  // 
  // SECONDARY SHOWROOM DELIVERIES:
  // - showroom_type='SECONDARY' (date-specific, no primary photographer today)
  // - Initially PENDING (unassigned) or UNASSIGNED (from another photographer)
  // - Accept/Reject prompt at T-30
  // - Once accepted/assigned by current user, becomes ASSIGNED and STAYS in Secondary section
  // - Do NOT include REJECTED here - those go to Not Chosen
  // - V1 RULE: Assignment rules depend on status + timing, not showroom ownership
  // 
  // NOT CHOSEN DELIVERIES:
  // - REJECTED (rejected by all photographers)
  // - REJECTED_CUSTOMER (rejected by customer - terminal)
  // - POSTPONED (admin action - terminal)
  // - CANCELED (admin action - terminal)
  // V1 RULE: A delivery moves to Not Chosen ONLY IF:
  //   1. Delivery time is reached
  //   2. AND no one accepted
  //   3. AND all photographers either rejected OR ignored
  // DO NOT move deliveries here just because someone rejected
  // DO NOT move deliveries here if prompt expired for one user
  // V1 FIX: Not Chosen must ONLY include these terminal/rejected states
  // DO NOT include primary deliveries merely unassigned
  // DO NOT include deliveries where prompt is still active
  
  // V1 FIX: PRIMARY deliveries logic:
  // - Show PRIMARY deliveries ASSIGNED to current user
  // - UNASSIGNED PRIMARY deliveries do NOT show here - they move to Secondary section (available to all)
  // - Once ASSIGNED to another user, hide from original photographer
  const primaryDeliveries = deliveries.filter(d => {
    if (d.showroom_type !== 'PRIMARY') return false;
    
    // Exclude terminal states
    if (['REJECTED', 'REJECTED_CUSTOMER', 'POSTPONED_CANCELED'].includes(d.status)) {
      return false;
    }
    
    // V1 CRITICAL FIX: ONLY show if ASSIGNED to current user
    // UNASSIGNED primary deliveries go to Secondary section (available to all cluster photographers)
    if (d.status === 'ASSIGNED' && d.assigned_user_id === user?.id) {
      return true;
    }
    
    return false;
  });
  
  const secondaryDeliveries = deliveries.filter(d => {
    // Exclude terminal states
    if (['REJECTED', 'REJECTED_CUSTOMER', 'POSTPONED_CANCELED'].includes(d.status)) {
      return false;
    }
    
    // V1 CRITICAL: UNASSIGNED deliveries from ANY source show as SECONDARY (available to claim)
    // This includes PRIMARY deliveries that were unassigned by their original photographer
    if (d.status === 'UNASSIGNED' && d.cluster_code === user?.cluster_code) {
      return true;
    }
    
    // Regular SECONDARY deliveries ASSIGNED to current user (stay in secondary section)
    if (d.showroom_type === 'SECONDARY' && d.status === 'ASSIGNED' && d.assigned_user_id === user?.id) {
      return true;
    }
    
    return false;
  });
  
  // V1 SPEC: Not Chosen ONLY includes rejected-by-all, REJECTED_CUSTOMER, postponed, cancelled
  // V1 CRITICAL RULE: Populate Not Chosen Deliveries ONLY when:
  // - All photographers have rejected OR
  // - Delivery time has passed with no acceptance OR
  // - Status is POSTPONED / CANCELLED / REJECTED_CUSTOMER
  // DO NOT move deliveries here on single-user rejection.
  const notChosenDeliveries = deliveries.filter(d => 
    d.status === 'REJECTED' || // Rejected by all photographers at delivery time
    d.status === 'REJECTED_CUSTOMER' || // Terminal: customer rejected
    d.status === 'POSTPONED_CANCELED' || // Terminal: admin postponed
    d.status === 'CANCELED' // Terminal: admin canceled
  );
  
  // V1 SPEC: "Deliveries Finished?" enabled only if there exists ≥1 delivery that is:
  // - ASSIGNED
  // - NOT canceled/postponed
  const hasAssignedDeliveries = deliveries.some(d => 
    d.status === 'ASSIGNED' && 
    d.assigned_user_id === user?.id &&
    !['CANCELED', 'POSTPONED_CANCELED'].includes(d.status)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading deliveries...</div>
      </div>
    );
  }

  return (
    <>
      {/* Show Send Update Screen as full overlay */}
      {showSendUpdate ? (
        <SendUpdateScreen
          deliveries={deliveries.filter(d => d.status === 'ASSIGNED')}
          screenshots={screenshots}
          onBack={() => {
            setShowSendUpdate(false);
            setDeliveriesFinishedClicked(false);
          }}
          onUpdateFootageLink={handleUpdateFootageLink}
          onUploadScreenshot={handleUploadScreenshot}
          onComplete={(updatedDeliveries) => {
            console.log('HomeScreen: onComplete called with', updatedDeliveries.length, 'deliveries');
            
            // V1 CRITICAL: Update mockDeliveries directly so deliveries stay DONE across navigation
            updatedDeliveries.forEach(updatedDelivery => {
              const deliveryIndex = mockDeliveries.findIndex(d => d.id === updatedDelivery.id);
              console.log(`Updating delivery ${updatedDelivery.delivery_name} (index ${deliveryIndex}) to DONE`);
              if (deliveryIndex !== -1) {
                mockDeliveries[deliveryIndex] = {
                  ...mockDeliveries[deliveryIndex],
                  ...updatedDelivery,
                  status: 'DONE',
                };
                console.log(`✅ Updated mockDeliveries[${deliveryIndex}]:`, mockDeliveries[deliveryIndex].delivery_name, 'status:', mockDeliveries[deliveryIndex].status);
              }
            });
            
            console.log('📊 All mockDeliveries after update:', mockDeliveries.map(d => ({ name: d.delivery_name, status: d.status })));
            
            // Update local state deliveries to DONE status
            setDeliveries(prev => prev.map(d => {
              const updated = updatedDeliveries.find(ud => ud.id === d.id);
              return updated || d;
            }));
            
            // V1 SPEC: Create reel tasks for each completed delivery
            updatedDeliveries.forEach(delivery => {
              // Check if reel task already exists for this delivery
              const existingTask = mockReelTasks.find(t => t.delivery_id === delivery.id);
              
              if (!existingTask) {
                // Create new reel task
                const newReelTask = {
                  id: `r${Date.now()}_${delivery.id}`,
                  delivery_id: delivery.id,
                  assigned_user_id: user?.id || '',
                  reel_link: null,
                  status: 'PENDING' as const,
                  reassigned_reason: null,
                };
                
                mockReelTasks.push(newReelTask);
                console.log('Created reel task for delivery:', delivery.delivery_name, newReelTask);
              }
            });
            
            // Update photographer day state
            setServicedCount(updatedDeliveries.length);
            setPhotographerDayState('CLOSED');
            
            // V1 CRITICAL: Persist photographer day state so it survives navigation
            if (user?.id) {
              photographerDayStates[user.id] = {
                servicedCount: updatedDeliveries.length,
                dayState: 'CLOSED',
              };
            }
            
            // Close the send update screen and reset button state
            setShowSendUpdate(false);
            setDeliveriesFinishedClicked(false);
            
            console.log('HomeScreen: State updated, showSendUpdate set to false');
            toast.success(`Day completed! ${updatedDeliveries.length} deliveries covered.`);
          }}
        />
      ) : photographerDayState === 'CLOSED' ? (
        <div className="space-y-6 pb-24">
          {/* Top Bar with Day Closed Banner */}
          <div className="bg-white border-b pb-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              {new Date().toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <h1 className="text-2xl font-bold mt-1">{user?.name}</h1>
            
            {/* V1 SPEC: Strong finality cue - Day Closed visual state */}
            <div className="mt-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
              <p className="text-sm font-bold text-red-900 text-center">
                🔒 DAY CLOSED
              </p>
              <p className="text-xs text-red-700 text-center mt-1">
                No further edits, uploads, or timing updates possible until tomorrow
              </p>
            </div>
          </div>

          {/* SECTION 1: Deliveries Serviced Today - Count Only */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-[#16A34A]"></div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Deliveries Serviced Today</h2>
            </div>
            <Card className="bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Completed</div>
                    <div className="text-5xl font-bold mt-1 text-gray-800">{servicedCount}</div>
                  </div>
                  <CheckCircle2 className="h-14 w-14 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECTION 2: Primary Deliveries - Empty */}
          <TooltipProvider>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-[#2563EB]"></div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Primary Deliveries</h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="ml-1">
                      <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Showrooms that are permanently assigned to you in the system. These are your regular showrooms.</p>
                  </TooltipContent>
                </Tooltip>
                <Badge className="bg-[#2563EB] text-white ml-auto">0</Badge>
              </div>
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="py-8 text-center">
                  <p className="text-gray-400 text-sm">All deliveries cleared for today</p>
                </CardContent>
              </Card>
            </div>
          </TooltipProvider>

          {/* SECTION 3: Secondary Deliveries - Empty */}
          <TooltipProvider>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-[#F59E0B]"></div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Secondary Deliveries (Today)</h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="ml-1">
                      <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Showrooms not permanently assigned to you. This includes showrooms assigned to other photographers or showrooms with no primary photographer in your cluster.</p>
                  </TooltipContent>
                </Tooltip>
                <Badge variant="outline" className="border-[#F59E0B] text-[#F59E0B] ml-auto">0</Badge>
              </div>
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="py-8 text-center">
                  <p className="text-gray-400 text-sm">All deliveries cleared for today</p>
                </CardContent>
              </Card>
            </div>
          </TooltipProvider>

          {/* SECTION 4: Not Chosen Deliveries - Empty */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-amber-400"></div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Not Chosen Deliveries</h2>
              <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700 ml-auto">0</Badge>
            </div>
            <Card className="border-dashed border-2 border-gray-200">
              <CardContent className="py-8 text-center">
                <p className="text-gray-400 text-sm">All deliveries cleared for today</p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6 pb-24">
          {/* Accept/Reject Dialog */}
          {pendingPrompt && (
            <AcceptRejectDialog
              delivery={pendingPrompt}
              onAccept={handleAccept}
              onReject={handleReject}
              onExpiry={handleAutoReject}
              onClose={() => setPendingPrompt(null)}
            />
          )}

          {/* V1 TIMING PROMPT: Hourly delivery timing input dialog */}
          {showTimingPrompt && currentShowroomPrompt && (
            <TimingPrompt
              showroomCode={currentShowroomPrompt.showroomCode}
              showroomName={currentShowroomPrompt.showroomName}
              clusterCode={currentShowroomPrompt.clusterCode}
              date={new Date().toISOString().split('T')[0]}
              existingDeliveries={deliveries.filter(
                d => 
                  d.showroom_code === currentShowroomPrompt.showroomCode && 
                  d.date === new Date().toISOString().split('T')[0]
              )}
              onAddDelivery={handleAddDelivery}
              onDeleteDelivery={handleDeleteDelivery}
              onUpdateTiming={handleUpdateDeliveryTiming}
              onDismiss={handleDismissTimingPrompt}
              photographerId={user?.id || ''}
              paymentType={currentShowroomPrompt.paymentType}
              showroomType={currentShowroomPrompt.showroomType}
            />
          )}

          {/* Top Bar */}
          <div className="bg-white border-b pb-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              {new Date().toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <h1 className="text-2xl font-bold mt-1">{user?.name}</h1>
          </div>

          {/* SECTION 1: Deliveries Serviced Today - Count Only */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-[#16A34A]"></div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Deliveries Serviced Today</h2>
            </div>
            <Card className="bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Completed</div>
                    <div className="text-5xl font-bold mt-1 text-gray-800">{servicedCount}</div>
                  </div>
                  <CheckCircle2 className="h-14 w-14 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECTION 2: Primary Deliveries */}
          <TooltipProvider>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-[#2563EB]"></div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Primary Deliveries</h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="ml-1">
                      <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Showrooms that are permanently assigned to you in the system. These are your regular showrooms.</p>
                  </TooltipContent>
                </Tooltip>
                <Badge className="bg-[#2563EB] text-white ml-auto">{primaryDeliveries.length}</Badge>
              </div>
              {primaryDeliveries.length > 0 ? (
                <div className="space-y-3">
                  {primaryDeliveries.map(delivery => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      screenshots={screenshots.get(delivery.id) || []}
                      onUpdateTiming={handleUpdateTiming}
                      onUpdateFootageLink={handleUpdateFootageLink}
                      onUploadScreenshot={handleUploadScreenshot}
                      onUnassign={handleUnassign}
                      onSelfAssign={handleAssignSelf}
                      onPostpone={handlePostponedCanceled}
                      onRejectedByCustomer={handleRejectedByCustomer}
                      currentUserId={user?.id}
                      dayCompleted={photographerDayState === 'CLOSED'}
                    />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-2 border-gray-200">
                  <CardContent className="py-8 text-center">
                    <p className="text-gray-400 text-sm">No primary deliveries assigned</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TooltipProvider>

          {/* SECTION 3: Secondary Deliveries */}
          <TooltipProvider>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-[#F59E0B]"></div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Secondary Deliveries (Today)</h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="ml-1">
                      <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Showrooms not permanently assigned to you. This includes showrooms assigned to other photographers or showrooms with no primary photographer in your cluster.</p>
                  </TooltipContent>
                </Tooltip>
                <Badge variant="outline" className="border-[#F59E0B] text-[#F59E0B] ml-auto">{secondaryDeliveries.length}</Badge>
              </div>
              {secondaryDeliveries.length > 0 ? (
                <div className="space-y-3">
                  {secondaryDeliveries.map(delivery => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      screenshots={screenshots.get(delivery.id) || []}
                      onUpdateTiming={handleUpdateTiming}
                      onUpdateFootageLink={handleUpdateFootageLink}
                      onUploadScreenshot={handleUploadScreenshot}
                      onUnassign={handleUnassign}
                      onSelfAssign={handleAssignSelf}
                      onPostpone={handlePostponedCanceled}
                      onRejectedByCustomer={handleRejectedByCustomer}
                      currentUserId={user?.id}
                      dayCompleted={photographerDayState === 'CLOSED'}
                    />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-2 border-gray-200">
                  <CardContent className="py-8 text-center">
                    <p className="text-gray-400 text-sm">No secondary deliveries available</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TooltipProvider>

          {/* SECTION 4: Not Chosen Deliveries */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-amber-400"></div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Not Chosen Deliveries</h2>
              <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700 ml-auto">{notChosenDeliveries.length}</Badge>
            </div>
            
            {/* V1 SPEC: Explain what Not Chosen means and self-assignability rules */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <p className="text-xs text-amber-800">
                <strong>Not Chosen includes:</strong> Deliveries rejected by all photographers, unassigned primary deliveries after reject cycle, canceled/postponed by admin.
              </p>
              <p className="text-xs text-red-700 font-semibold">
                🚫 You CANNOT self-assign: Customer-rejected, Postponed, or Cancelled deliveries.
              </p>
            </div>
            
            {notChosenDeliveries.length > 0 ? (
              <div className="space-y-3">
                {notChosenDeliveries.map(delivery => (
                  <DeliveryCard
                    key={delivery.id}
                    delivery={delivery}
                    screenshots={screenshots.get(delivery.id) || []}
                    showAssignability={true}
                    onSelfAssign={handleAssignSelf}
                    onPostpone={handlePostponedCanceled}
                    onRejectedByCustomer={handleRejectedByCustomer}
                    currentUserId={user?.id}
                    dayCompleted={photographerDayState === 'CLOSED'}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="py-8 text-center">
                  <p className="text-gray-400 text-sm">No deliveries in this category</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
      
      {/* Bottom Sticky Button - V1 SPEC: Always enabled to allow day closure even with zero deliveries */}
      {!showSendUpdate && photographerDayState === 'ACTIVE' && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t shadow-lg">
          <Button
            className="w-full h-16 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold shadow-md flex flex-col items-center justify-center gap-1"
            onClick={() => {
              // Single click - open Send Update screen directly
              setShowSendUpdate(true);
            }}
          >
            <span className="text-lg">Deliveries Finished?</span>
            <span className="text-xs font-normal opacity-90">
              Close day and send update to admin
            </span>
          </Button>
        </div>
      )}

      {/* Geofence Alert */}
      {geofenceBreach && (
        <GeofenceAlert
          breach={geofenceBreach.breach}
          delivery={geofenceBreach.delivery}
          onClose={() => setGeofenceBreach(null)}
        />
      )}
    </>
  );
}
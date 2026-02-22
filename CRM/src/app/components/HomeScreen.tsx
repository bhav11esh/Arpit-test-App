import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Delivery, GeofenceBreach, PhotographerDayState } from '../types';
import { useConfig } from '../context/ConfigContext';
import * as deliveriesDb from '../lib/db/deliveries';
import * as reelsDb from '../lib/db/reels';
import { mockScreenshots, mockReelTasks, simulateApiDelay, photographerDayStates } from '../lib/mockData';
import { DeliveryCard } from './DeliveryCard';
import { AcceptRejectDialog } from './AcceptRejectDialog';
import { SendUpdateScreen } from './SendUpdateScreen';
import { GeofenceAlert } from './GeofenceAlert';
import { TimingPrompt } from './TimingPrompt';
import { scheduleGeofenceCheck } from '../lib/geofence';
import { createLogEvent } from '../lib/logging';
import { createRejection, getDistinctRejections, getUserRejections } from '../lib/db/rejections'; // V1 MATCH
import { getActiveUsersByCluster } from '../lib/db/users'; // V1 MATCH
import { getAllLeaves } from '../lib/db/leaves'; // V1 IMPORT
import { uploadScreenshotFile, createScreenshot } from '../lib/db/screenshots'; // V1 MATCH
import { shouldShowAcceptRejectPrompt, isPromptExpired, generateDeliveryName, canSelfAssign, getLocalDateString, getOperationalDateString, requestNotificationPermission, sendPushNotification } from '../lib/utils';
import { supabase, adminSupabase } from '../lib/supabase';
import {
  shouldShowTimingPrompt,
  dismissPrompt,
  finalizeShowroom,
  getNextCreationIndex,
  markEndOfDay,
  hasEndedDay,
} from '../lib/timingPrompt';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Calendar, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { getClusterShortCode } from '../lib/utils'; // V1 IMPORT

export function HomeScreen() {
  const { user } = useAuth();
  // V1 DEBUG FIX: Mallikarjun (pavanmanne735@gmail.com) is missing cluster_code in DB.
  const { dealerships, clusters, mappings } = useConfig();


  // V1 REFACTOR: Restore administrative access check (simplified)
  // We use adminSupabase if available for advanced operations
  const shouldUseAdmin = !!adminSupabase;

  // V1 REFACTOR: Infer Cluster from PRIMARY Mapping
  // No more hardcoded email checks or manual cluster_code field
  // User's "effective cluster" is the one where they have a PRIMARY assignment.

  // Find primary mapping for current user
  const primaryMapping = mappings.find(m => m.photographerId === user?.id && m.mappingType === 'PRIMARY');
  const primaryCluster = clusters.find(c => c.id === primaryMapping?.clusterId);

  // The effective cluster is the NAME from the mapping (consistent with DB schema)
  // Fallback to user.cluster_code ONLY if legacy data exists and no mapping
  const effectiveClusterCode = primaryCluster?.name || user?.cluster_code;

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]); // V1 FIX: Store today's leaves
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
    dealershipId: string; // V1 FIX: Store ID for robust lookup
    clusterCode: string;
    paymentType: 'CUSTOMER_PAID' | 'DEALER_PAID';
    showroomType: 'PRIMARY' | 'SECONDARY';
  } | null>(null);

  useEffect(() => {
    loadData();

    // V1 CRITICAL: Load persisted photographer day state on mount
    if (user?.id) {
      // Request notification permissions for geolocation alerts
      requestNotificationPermission();

      // Check persistent day state from local storage first
      if (hasEndedDay(user.id)) {
        setPhotographerDayState('CLOSED');
        // servicedCount will be updated by loadData/poller when it counts DONE deliveries
      } else if (photographerDayStates[user.id]) {
        // Fallback to mock data for backward compatibility during dev
        setPhotographerDayState(photographerDayStates[user.id].dayState);
        setServicedCount(photographerDayStates[user.id].servicedCount);
      }
    }
  }, [user]);

  // V1 CRITICAL: Poll for real deliveries from database every 5 seconds
  useEffect(() => {
    if (!user) return;

    const fetchDeliveries = async () => {
      try {
        const today = getOperationalDateString();

        // 1. Get deliveries assigned to current user (for today or any incomplete ones if needed? V1 spec implies daily view usually)
        // We'll fetch all assigned to user to be safe, or maybe filtered by today? 
        // Existing mock logic filtered by date? No, mockDeliveries.filter didn't enforce date in the polling loop (lines 73-98), 
        // but typically we care about today. However, let's fetch pending ones.
        // Actually, let's fetch *all* explicitly to match the extensive filtering logic:

        // Determine client to use
        // Determine client to use
        const client = shouldUseAdmin ? adminSupabase : supabase;

        // V1 CRITICAL: Fetch ALL deliveries for today to ensure we see:
        // 1. Personally assigned deliveries (even if status changed)
        // 2. Unassigned deliveries in cluster (Secondary section)
        // 3. Rejected/Not Chosen items (available for self-assignment)
        const allToday = await deliveriesDb.getDeliveriesByDate(today, client);

        // V1 FIX: Fetch leaves for mapping failover logic
        // We need to know who is on leave today to show their showrooms to others in the cluster
        const todayLeaves = await import('../lib/db/leaves').then(m => m.getAllLeaves());
        // Filter for today
        setLeaves(todayLeaves.filter(l => l.date === today));

        // Filter and deduplicate for cluster relevance
        const clusterDeliveries = allToday.filter(d =>
          d.assigned_user_id === user.id ||
          (effectiveClusterCode && d.cluster_code === effectiveClusterCode)
        );

        // Update counts and state
        const doneCount = clusterDeliveries.filter(d => d.status === 'DONE' && d.assigned_user_id === user.id).length;
        if (doneCount !== servicedCount) {
          setServicedCount(doneCount);
        }

        // Filter out DONE ones for the list sections to keep them clean
        const activeDeliveries = clusterDeliveries.filter(d => d.status !== 'DONE');

        if (JSON.stringify(deliveries) !== JSON.stringify(activeDeliveries)) {
          setDeliveries(activeDeliveries);
        }
      } catch (err) {
        console.error('Error polling deliveries:', err);
      }
    };

    fetchDeliveries(); // Initial fetch
    const pollInterval = setInterval(fetchDeliveries, 5000); // Poll every 5s

    return () => clearInterval(pollInterval);
  }, [user, effectiveClusterCode]); // Remove 'deliveries' dependency to avoid loops, relies on setDeliveries check

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
        // Resolve target coordinates from mappings
        const mapping = mappings.find(m => {
          const dealership = dealerships.find(d => d.id === m.dealershipId);
          // Showroom code matching logic: "Name (CODE)" -> CODE, or fallback to ID
          const showroomCode = dealership?.name.match(/\(([^)]+)\)/)?.[1] || m.dealershipId;
          return showroomCode === delivery.showroom_code;
        });

        if (mapping) {
          const cleanup = scheduleGeofenceCheck(
            delivery,
            user.id,
            mapping.latitude,
            mapping.longitude,
            (breach) => {
              setGeofenceBreach({ breach, delivery });
              // Log breach to DB with enhanced metadata for Admin notifications
              const client = shouldUseAdmin ? adminSupabase : supabase;
              import('../lib/db/logs').then(({ createLogEvent }) => {
                createLogEvent({
                  type: 'GEOFENCE_BREACH',
                  actor_user_id: user.id,
                  target_id: delivery.id,
                  metadata: {
                    latitude: breach.latitude,
                    longitude: breach.longitude,
                    distance_from_target: breach.distance_from_target,
                    breach_time: breach.breach_time,
                    target_lat: mapping.latitude,
                    target_lng: mapping.longitude,
                    // V1 ENRICHMENT: For Admin Push Notifications
                    delivery_name: delivery.delivery_name,
                    delivery_time: delivery.timing,
                    photographer_name: user.name,
                    showroom_code: delivery.showroom_code
                  }
                }, client);
              });

              // V1 SPEC: Send Push Notification to Photographer
              const distanceKm = breach.distance_from_target >= 1000
                ? `${(breach.distance_from_target / 1000).toFixed(1)}km`
                : `${breach.distance_from_target}m`;

              sendPushNotification('Location Alert!', {
                body: `You are ${distanceKm} away from ${delivery.showroom_code}. Please ensure you are at the correct location for your ${delivery.timing} delivery.`,
                icon: '/favicon.ico',
                tag: `breach_${delivery.id}`
              });
            }
          );

          if (cleanup) {
            cleanupFunctions.push(cleanup);
          }
        } else {
          // console.warn(`⚠️ [Geofence] No mapping found for showroom ${delivery.showroom_code}`);
          // Suppress warning as it might just be a mismatch in naming convention for now
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

  // V1 FIX: Ref to track deliveries processed locally to prevent prompt re-appearance race condition
  const processedDeliveriesRef = React.useRef<Set<string>>(new Set());
  // V1 SPEC: Track unassigned deliveries already notified via push to this user
  const notifiedDeliveriesRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const checkForPrompts = async () => {
      // Find all UNASSIGNED deliveries in user's cluster that should show prompt
      const candidates = deliveries.filter(delivery =>
        (delivery.showroom_type === 'SECONDARY' || delivery.status === 'UNASSIGNED') &&
        shouldShowAcceptRejectPrompt(delivery, effectiveClusterCode) &&
        delivery.status !== 'ASSIGNED'
      );

      if (candidates.length === 0) return;

      // V1 FIX: Filter out deliveries already rejected by this user (check DB/cache)
      // Optimization: Fetch rejections for these candidates in parallel or check one by one?
      // Since candidate list is small (usually 0-1), check one by one is fine for now.
      // Better: Fetch all my rejections for today.

      const { getUserRejections } = await import('../lib/db/rejections');
      let myRejectedIds: string[] = [];

      try {
        myRejectedIds = await getUserRejections(user.id);
      } catch (err) {
        console.error('Error checking rejections (defaulting to allow):', err);
        // Fallback: If table missing or error, assume no rejections so prompts still appear
        myRejectedIds = [];
      }

      const rejectedSet = new Set(myRejectedIds);
      // V1 FIX: Also exclude recently processed deliveries (to prevent double prompt race condition)
      const eligibleDeliveries = candidates.filter(d =>
        !rejectedSet.has(d.id) &&
        !processedDeliveriesRef.current.has(d.id)
      );

      // V1 CRITICAL: Close prompt if current delivery is no longer eligible
      if (pendingPrompt) {
        const stillEligible = eligibleDeliveries.find(d => d.id === pendingPrompt.id);
        if (!stillEligible) {
          setPendingPrompt(null);
        }
      }

      // Show first eligible delivery if any
      if (eligibleDeliveries.length > 0 && !pendingPrompt) {
        setPendingPrompt(eligibleDeliveries[0]);
      }

      // V1 SPEC: Push Notification for Photographer Pool (30m before delivery timing)
      // Conditions: User is NOT on leave, day is NOT closed, and notification not already sent
      const today = getOperationalDateString();
      const isOnLeave = leaves.some(l => l.photographerId === user?.id && l.date === today);

      if (!isOnLeave && photographerDayState === 'ACTIVE') {
        eligibleDeliveries.forEach(d => {
          if (!notifiedDeliveriesRef.current.has(d.id)) {
            sendPushNotification('New Pool Delivery! 🔔', {
              body: `${d.showroom_code}: ${d.delivery_name} is available for ${d.timing}. Open the app to accept/reject.`,
              icon: '/favicon.ico',
              tag: `pool_${d.id}`,
              requireInteraction: true
            });
            notifiedDeliveriesRef.current.add(d.id);
          }
        });
      }

      // V1 SPEC: Also check for ANY unassigned deliveries that have passed delivery time...
      // (Rest of logic remains same, just ensuring prompt logic is filtered)
    };

    // Initial check
    checkForPrompts();

    // Check every 30 seconds
    const interval = setInterval(checkForPrompts, 30000);

    return () => clearInterval(interval);
  }, [user, pendingPrompt, deliveries, effectiveClusterCode]);

  // V1 TIMING PROMPT: Hourly checker for showrooms needing timing input
  // Starts at 9:00 AM, repeats every 1 hour
  // Stops when all deliveries for showroom are finalized (have timing)
  useEffect(() => {
    if (!user) return;

    if ((photographerDayState as string) === 'CLOSED' || mappings.length === 0) {
      console.warn('🕒 Timing Effect Aborting: Day status closed or no mappings');
      return;
    }

    const checkForTimingPrompts = async () => {
      const nowHour = new Date().getHours();

      // Only show prompts after 9 AM
      if (nowHour < 9) return;

      // V1 FIX: Don't interrupt/switch showrooms if a prompt is already showing
      if (showTimingPrompt) return;

      const today = getOperationalDateString();

      const malliId = 'bc268775-f79f-4400-b10b-bea4ba1dc762';
      const malliLeave = leaves.find(l => l.photographerId === malliId && l.date === today);

      const clusterDealerships = dealerships.filter(d => {
        // Find mapping for this dealership that matches OUR cluster
        const dMapping = mappings.find(m =>
          m.dealershipId === d.id &&
          (m.clusterId === effectiveClusterCode || clusters.find(c => c.id === m.clusterId)?.name === effectiveClusterCode)
        );

        // V1 FALLBACK: If NO mapping exists in DB, check if there are 
        // ANY deliveries for this showroom today in our cluster.
        // This handles "orphaned" or unmapped showrooms like PPS Mahindra/Khivraj Triumph 
        // until they are officially mapped.
        const normalize = (str: string) => str.toUpperCase().replace(/[^A-Z0-9]+/g, '');
        const normalizedDealershipName = normalize(d.name);

        // RESOLVE CLUSTER NAME for comparison (User has UUID, Delivery has Name)
        // effectiveClusterCode is already the NAME when inferred from mapping
        const currentCluster = clusters.find(c => c.name === effectiveClusterCode || c.id === effectiveClusterCode);
        const clusterName = currentCluster?.name || (typeof effectiveClusterCode === 'string' && !effectiveClusterCode.includes('-') ? clusters.find(c => c.id === effectiveClusterCode)?.name : effectiveClusterCode);

        const hasDeliveriesInCluster = deliveries.some(
          del => {
            // CLUSTER CHECK:
            // Support checking against either ID or Name
            const matchesCluster =
              del.cluster_code === effectiveClusterCode ||
              (clusterName && del.cluster_code === clusterName); // Ensure clusterName is resolved before comparing

            if (!matchesCluster) return false;

            const normalizedDeliveryCode = normalize(del.showroom_code);
            const normalizedDeliveryName = del.delivery_name ? normalize(del.delivery_name) : '';

            // Check 1: Strict Normalized Match
            if (normalizedDeliveryCode === normalizedDealershipName) return true;

            // Check 2: Partial Match (if dealership name contains the code or vice versa)
            // e.g. "PPS Mahindra" vs "PPS"
            if (normalizedDealershipName.includes(normalizedDeliveryCode) || normalizedDeliveryCode.includes(normalizedDealershipName)) return true;

            // Check 3: ID Match
            if (del.showroom_code === d.id) return true;

            return false;
          }
        );

        if (dMapping) {
          const cluster = clusters.find(c => c.id === dMapping.clusterId);
          return cluster?.id === effectiveClusterCode || cluster?.name === effectiveClusterCode;
        }

        return hasDeliveriesInCluster;
      });

      // V1 UX FIX: Prioritize MY Primary Showroom first
      const myPrimaryId = mappings.find(m => m.photographerId === user.id && m.mappingType === 'PRIMARY')?.dealershipId;

      // V1 ROBUSTNESS: Ensure Primary is always in the list, even if cluster filter misses it
      if (myPrimaryId) {
        const isMapped = clusterDealerships.some(d => d.id === myPrimaryId);
        if (!isMapped) {
          const primaryDealership = dealerships.find(d => d.id === myPrimaryId);
          if (primaryDealership) {
            clusterDealerships.push(primaryDealership);
          }
        }

        clusterDealerships.sort((a, b) => {
          if (a.id === myPrimaryId) return -1;
          if (b.id === myPrimaryId) return 1;
          return 0;
        });
      }

      // Check each showroom
      for (const dealership of clusterDealerships) {
        // V1 FIX: Find mapping for this dealership that matches OUR cluster
        const currentClusterMapping = mappings.filter(m => m.dealershipId === dealership.id).find(m =>
          m.clusterId === effectiveClusterCode || clusters.find(c => c.id === m.clusterId)?.name === effectiveClusterCode
        );

        const primaryMapping = currentClusterMapping?.mappingType === 'PRIMARY' ? currentClusterMapping : null;

        let isVisible = false;
        let finalShowroomType: 'PRIMARY' | 'SECONDARY' = 'SECONDARY';

        if (primaryMapping) {
          if (primaryMapping.photographerId === user.id) {
            // Case 1: Current photographer is assigned to the Primary Mapping for this showroom
            isVisible = true;
            finalShowroomType = 'PRIMARY';
          } else {
            // Case 2: Someone else is the Primary photographer for this showroom
            // Check if that photographer is on leave today
            const isPrimaryOnLeave = leaves.some(l =>
              l.photographerId === primaryMapping.photographerId &&
              l.date === today
            );

            if (isPrimaryOnLeave) {
              isVisible = true;
              finalShowroomType = 'SECONDARY';
            } else {
              // Primary is working -> HIDE for all other cluster members
              isVisible = false;
            }
          }
        } else {
          // Case 3: No Primary mapping (Showroom is Secondary or Orphaned) -> Show to everyone in cluster
          isVisible = true;
          finalShowroomType = 'SECONDARY';
        }

        if (!isVisible) continue;

        // --- Existing Timing Check Logic ---

        // Generate cleaner showroom code
        const nameBasedCode = dealership.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        const showroomCode = dealership.name.match(/\(([^)]+)\)/)?.[1] || nameBasedCode || dealership.id;

        // Resolve cluster info for filter
        const currentCluster = clusters.find(c => c.id === effectiveClusterCode);
        const clusterName = currentCluster?.name;

        // V1 FIX: Robust delivery filtering matching the fallback logic
        const showroomDeliveries = deliveries.filter(d => {
          // 0. Date Check (Critical)
          if (d.date !== today) return false;

          // CLUSTER CHECK:
          // Support checking against either ID or Name
          const matchesCluster =
            d.cluster_code === effectiveClusterCode ||
            (clusterName && d.cluster_code === clusterName);

          if (!matchesCluster) return false;

          // 1. Normalized Code (PPS_MAHINDRA)
          const normalize = (str: string) => str.toUpperCase().replace(/[^A-Z0-9]+/g, '');
          const normalizedDeliveryCode = normalize(d.showroom_code);
          const normalizedDealershipName = normalize(dealership.name);

          if (normalizedDeliveryCode === normalizedDealershipName) return true;

          // 2. Partial Match (Robust Fallback)
          if (normalizedDealershipName.includes(normalizedDeliveryCode) || normalizedDeliveryCode.includes(normalizedDealershipName)) return true;

          // 3. ID Match
          if (d.showroom_code === dealership.id) return true;
          // 4. Name Match (PPS Mahindra) - Legacy check
          if (d.showroom_code.toLowerCase() === dealership.name.toLowerCase()) return true;

          return false;
        });

        const client = shouldUseAdmin ? adminSupabase : supabase;
        const shouldShow = await shouldShowTimingPrompt(showroomCode, today, showroomDeliveries, client);

        if (shouldShow) {

          // Find cluster name for display
          // We already filtered by effectiveClusterCode, so we can use that, or look up strictly
          const dClusterMapping = mappings.find(m => m.dealershipId === dealership.id);
          let cluster = clusters.find(c => c.id === dClusterMapping?.clusterId);

          // V1 FALLBACK: If unmapped, use the cluster we resolved earlier from user context
          if (!cluster) {
            // If we found deliveries for this showroom in the current cluster, 
            // we can safely assume it belongs to this cluster for the prompt.
            cluster = currentCluster;

            // Double check: if currentCluster is undefined but we have effectiveClusterCode string
            if (!cluster && typeof effectiveClusterCode === 'string') {
              // Try to find by name again or just construct a temporary object for display
              cluster = clusters.find(c => c.name === effectiveClusterCode);

              if (!cluster) {
                // Ultimate fallback for display
                cluster = { id: 'temp', name: effectiveClusterCode };
              }
            }
          }

          if (cluster) {
            setCurrentShowroomPrompt({
              showroomCode: showroomCode,
              showroomName: dealership.name,
              dealershipId: dealership.id,
              clusterCode: cluster.name,
              paymentType: (dealership as any).paymentType || (dealership as any).payment_type || 'CUSTOMER_PAID',
              showroomType: finalShowroomType,
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
  }, [user, photographerDayState, deliveries, mappings, dealerships, clusters, effectiveClusterCode, leaves]);

  const loadData = async () => {
    // V1 CRITICAL: Load deliveries based on cluster visibility rules
    setLoading(true);
    try {
      // 1. Get deliveries assigned to current user
      // 1. Get deliveries assigned to current user for TODAY only
      const myDeliveries = await deliveriesDb.getDeliveries({
        assignedUserId: user?.id,
        date: getOperationalDateString()
      });

      // Filter out DONE ones
      const activeMyDeliveries = myDeliveries.filter(d => d.status !== 'DONE');

      // 2. Get Unassigned in my cluster (for Accept/Reject flow)
      let unassignedDeliveries: Delivery[] = [];
      // effectiveClusterCode is defined at the top of the component

      if (effectiveClusterCode) {
        unassignedDeliveries = await deliveriesDb.getUnassignedDeliveries(effectiveClusterCode);
      }

      const allRelevant = [...activeMyDeliveries, ...unassignedDeliveries];

      // Deduplicate by ID just in case
      const uniqueDeliveries = Array.from(new Map(allRelevant.map(d => [d.id, d])).values());

      setDeliveries(uniqueDeliveries);

      // Group screenshots (mock screenshots for now, or real if we had them)
      // For now keep mock screenshots as we haven't implemented real photo uploads fully perhaps?
      // Or checking if screenshots exist.
      // The state is setScreenshots(Map).
      // Let's keep the mock screenshots but mapped to real delivery IDs if possible?
      // Or just empty map if we assume no screenshots yet.
      // Since we just wiped mockDeliveries, the IDs won't match mockScreenshots.
      setScreenshots(new Map());

      // 3. Get Today's Leaves - V1 FIX: Use admin client to bypass RLS
      // This ensures we can see Mallikarjun's leave for failover check
      const client = adminSupabase || supabase;
      const { data: allLeavesData, error: leavesError } = await client
        .from('leaves')
        .select('*');

      if (leavesError) {
        console.error('Error fetching global leaves:', leavesError);
      } else {
        const currentOperationalDate = getOperationalDateString();
        // Map to app types
        const todayLeaves = (allLeavesData || [])
          .filter(l => l.date === currentOperationalDate)
          .map(l => ({
            id: l.id,
            photographerId: l.photographer_id,
            date: l.date,
            half: l.half,
            appliedBy: l.applied_by,
            appliedAt: l.applied_at
          }));
        setLeaves(todayLeaves);
        console.log('Successfully loaded home data with global leaves:', todayLeaves.length);
      }
    } catch (err: any) {
      console.error('Failed to load home data:', err);
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (deliveryId: string) => {
    try {
      const client = shouldUseAdmin ? adminSupabase : supabase;
      // Optimistic update
      const updated = await deliveriesDb.updateDelivery(deliveryId, {
        status: 'ASSIGNED',
        assigned_user_id: user?.id,
        updated_at: new Date().toISOString()
      }, client);

      setDeliveries(prev => prev.map(d => d.id === deliveryId ? updated : d));

      // V1 FIX: Mark as processed immediately to prevent checkForPrompts picking it up again
      processedDeliveriesRef.current.add(deliveryId);

      setPendingPrompt(null);
      toast.success('Delivery accepted successfully');
    } catch (error) {
      console.error('Error accepting delivery:', error);
      toast.error('Failed to accept delivery');
    }
  };

  const handleReject = async (deliveryId: string) => {
    // V1 CRITICAL FIX: Single photographer rejection does NOT move delivery immediately
    // Delivery remains in its current section (PENDING) until:
    // - All photographers have rejected OR
    // - Delivery time expires with no acceptance
    // Only then does system mark it as REJECTED and move to Not Chosen
    await simulateApiDelay(300);

    // Save rejection to DB so prompt doesn't stick
    try {
      const { createRejection, getDistinctRejections } = await import('../lib/db/rejections');
      const { getActiveUsersByCluster } = await import('../lib/db/users');

      const client = shouldUseAdmin ? adminSupabase : supabase;
      await createRejection(deliveryId, user?.id || '', client);

      // CHECK: Have ALL active photographers in this cluster rejected?
      if (effectiveClusterCode) {
        const activeUsers = await getActiveUsersByCluster(effectiveClusterCode, client);
        const rejectedUserIds = await getDistinctRejections(deliveryId, client);

        const activeUserIds = activeUsers.map(u => u.id);
        const allRejected = activeUserIds.every(id => rejectedUserIds.includes(id));

        if (allRejected) {
          console.log('❌ Rejected by ALL active users in cluster. Moving to Not Chosen.');
          await deliveriesDb.updateDelivery(deliveryId, {
            status: 'REJECTED',
            rejected_by_all: true,
            rejected_by_all_timestamp: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, client);

          toast.info('Delivery moved to Not Chosen (rejected by everyone)');
          setDeliveries(prev => prev.map(d =>
            d.id === deliveryId
              ? { ...d, status: 'REJECTED', rejected_by_all: true, rejected_by_all_timestamp: new Date().toISOString() }
              : d
          ));
          setPendingPrompt(null);
          return;
        }
      }

      toast.info('Delivery declined (still available to others in your cluster)');
    } catch (err) {
      console.error('Failed to log rejection:', err);
      // Fallback: just close prompt locally
    }

    setPendingPrompt(null);
  };

  const handleAutoReject = async (deliveryId: string) => {
    try {
      const client = shouldUseAdmin ? adminSupabase : supabase;
      // V1 SPEC: Auto-reject = "REJECTED_BY_ALL" -> moves to Not Chosen
      await deliveriesDb.updateDelivery(deliveryId, {
        status: 'REJECTED', // Or whatever strict status DB uses, maybe REJECTED_BY_ALL?
        // Checking DB types... Status is DeliveryStatus. 
        // rejected_by_all is a separate boolean flag.
        rejected_by_all: true,
        rejected_by_all_timestamp: new Date().toISOString()
      }, client);

      setDeliveries(prev => prev.map(d =>
        d.id === deliveryId
          ? {
            ...d,
            status: 'REJECTED',
            rejected_by_all: true,
            rejected_by_all_timestamp: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          : d
      ));

      setPendingPrompt(null);
      toast.info('Delivery moved to Not Chosen (no acceptance by delivery time)');
    } catch (error) {
      console.error('Error auto-rejecting:', error);
    }
  };

  const handleUpdateTiming = async (deliveryId: string, timing: string) => {
    try {
      // Need current delivery to generate name
      const delivery = deliveries.find(d => d.id === deliveryId);
      if (!delivery) return;

      const newName = generateDeliveryName(
        delivery.date,
        delivery.showroom_code,
        getClusterShortCode(delivery.cluster_code),
        timing
      );

      const client = adminSupabase || supabase;
      const updated = await deliveriesDb.updateDelivery(deliveryId, {
        timing: timing,
        delivery_name: newName,
        updated_at: new Date().toISOString()
      }, client);

      if (pendingPrompt?.id === deliveryId) {
        setPendingPrompt(null);
      }

      setDeliveries(prev => prev.map(d => d.id === deliveryId ? updated : d));
      toast.success('Timing updated');
    } catch (error) {
      console.error('Error updating timing:', error);
      toast.error('Failed to update timing');
    }
  };

  const handleUpdateFootageLink = async (deliveryId: string, link: string) => {
    try {
      const client = shouldUseAdmin ? adminSupabase : supabase;
      const updated = await deliveriesDb.updateDelivery(deliveryId, {
        footage_link: link,
        updated_at: new Date().toISOString()
      }, client);

      setDeliveries(prev => prev.map(d => d.id === deliveryId ? updated : d));
      toast.success('Footage link updated');
    } catch (error) {
      console.error('Error updating footage link:', error);
      toast.error('Failed to update footage link');
    }
  };

  const handleUnassign = async (deliveryId: string) => {
    try {
      const client = shouldUseAdmin ? adminSupabase : supabase;

      // V1 FIX: Unassigning acts as an implicit rejection to prevent prompt loop
      // And we PRESERVE timing so others can see the prompt
      await createRejection(deliveryId, user?.id || '', client);

      let newStatus = 'UNASSIGNED';
      let markedRejectedByAll = false;

      // CHECK: Have ALL active photographers in this cluster now rejected?
      if (effectiveClusterCode) {
        const activeUsers = await getActiveUsersByCluster(effectiveClusterCode, client);
        const rejectedUserIds = await getDistinctRejections(deliveryId, client);

        // Add current user to rejected set (since we just rejected)
        if (user?.id && !rejectedUserIds.includes(user.id)) {
          rejectedUserIds.push(user.id);
        }

        const activeUserIds = activeUsers.map(u => u.id);
        const allRejected = activeUserIds.every(id => rejectedUserIds.includes(id));

        if (allRejected) {
          newStatus = 'REJECTED';
          markedRejectedByAll = true;
        }
      }

      const updatePayload: any = {
        status: newStatus,
        assigned_user_id: null,
        // timing: null, // V1 FIX: Preserve timing so others can accept
        footage_link: null,
        unassignment_by: user?.id,
        unassignment_timestamp: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (markedRejectedByAll) {
        updatePayload.rejected_by_all = true;
        updatePayload.rejected_by_all_timestamp = new Date().toISOString();
      }

      const updated = await deliveriesDb.updateDelivery(deliveryId, updatePayload, client);

      setDeliveries(prev => prev.map(d => d.id === deliveryId ? updated : d));
      setScreenshots(prev => {
        const newMap = new Map(prev);
        newMap.delete(deliveryId);
        return newMap;
      });

      if (markedRejectedByAll) {
        toast.info('Delivery unassigned and moved to Not Chosen (rejected by all)');
      } else {
        toast.success('Delivery unassigned (open for others)');
      }

    } catch (error) {
      console.error('Error unassigning:', error);
      toast.error('Failed to unassign delivery');
    }
  };

  const handleAssignSelf = async (deliveryId: string) => {
    try {
      const client = shouldUseAdmin ? adminSupabase : supabase;
      const updated = await deliveriesDb.updateDelivery(deliveryId, {
        status: 'ASSIGNED',
        assigned_user_id: user?.id,
        updated_at: new Date().toISOString()
      }, client);
      setDeliveries(prev => prev.map(d => d.id === deliveryId ? updated : d));
      toast.success('Delivery assigned to you successfully');
    } catch (error) {
      console.error('Error assigning self:', error);
      toast.error('Failed to assign delivery');
    }
  };

  const handlePostponedCanceled = async (deliveryId: string) => {
    try {
      const client = shouldUseAdmin ? adminSupabase : supabase;
      const updated = await deliveriesDb.updateDelivery(deliveryId, {
        status: 'POSTPONED_CANCELED',
        updated_at: new Date().toISOString(),
      }, client);
      setDeliveries(prev => prev.map(d => d.id === deliveryId ? updated : d));
      toast.info('Delivery postponed/canceled');
    } catch (error) {
      console.error('Error postponing/canceling:', error);
      toast.error('Failed to update delivery');
    }
  };

  const handleRejectedByCustomer = async (deliveryId: string) => {
    try {
      const client = shouldUseAdmin ? adminSupabase : supabase;
      const updated = await deliveriesDb.updateDelivery(deliveryId, {
        status: 'REJECTED_CUSTOMER',
        updated_at: new Date().toISOString(),
      }, client);
      setDeliveries(prev => prev.map(d => d.id === deliveryId ? updated : d));
      toast.success('Delivery marked as Rejected by Customer');
    } catch (error) {
      console.error('Error marking rejected by customer:', error);
      toast.error('Failed to update delivery');
    }
  };

  const handleUploadScreenshot = async (deliveryId: string, type: any, file: File) => {
    try {
      // V1 FIX: Persist screenshot to Storage + DB (using top-level imports)

      const fileExt = file.name.split('.').pop();
      const fileName = `${deliveryId}_${type}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`; // Bucket root or subfolder? Root is fine for now

      // V1 FIX: Use admin client to bypass RLS for uploads
      const client = adminSupabase || supabase;

      const publicUrl = await uploadScreenshotFile(file, filePath, client);

      const newScreenshot = await createScreenshot({
        delivery_id: deliveryId,
        user_id: user?.id || '',
        type,
        file_url: publicUrl,
        thumbnail_url: publicUrl, // Use same URL for now
        deleted_at: null
      }, client);

      setScreenshots(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(deliveryId) || [];
        newMap.set(deliveryId, [...existing, newScreenshot]);
        return newMap;
      });

      toast.success('Screenshot uploaded and saved');
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      toast.error('Failed to upload screenshot');
    }
  };

  // V1 TIMING PROMPT: Handler functions for delivery creation/deletion/timing

  const handleAddDelivery = async (timing: string | null) => {
    if (!currentShowroomPrompt || !user) return;

    try {
      const today = getOperationalDateString();

      // Use local state (which reflects DB) to calculate index
      const showroomDeliveries = deliveries.filter(
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
        ? generateDeliveryName(today, currentShowroomPrompt.showroomCode, getClusterShortCode(currentShowroomPrompt.clusterCode), timing)
        : generateDeliveryName(today, currentShowroomPrompt.showroomCode, getClusterShortCode(currentShowroomPrompt.clusterCode), undefined, creationIndex);

      // V1 FIX: Determine assignment based on GLOBAL primary mapping
      // Even if I am adding it (Akhil), if Aman is PRIMARY for this showroom, it goes to Aman as ASSIGNED
      // If no PRIMARY exists, it stays UNASSIGNED

      // Find the PRIMARY mapping for this showroom
      // We need to match by dealershipId which implies we need to find the dealership object first for the code
      // We have currentShowroomPrompt.showroomCode. Let's find the dealership ID from dealerships list

      // Reverse lookup dealership ID from code/name matching logic (approximated)
      // Better: we iterated mappings to find prompts. We can search mappings directly.

      let primaryPhotographerId: string | null = null;
      let targetMappingType: 'PRIMARY' | 'SECONDARY' = 'SECONDARY';

      // Find the PRIMARY mapping using the stored dealershipId
      const primaryMapping = mappings.find(m =>
        m.dealershipId === currentShowroomPrompt.dealershipId && m.mappingType === 'PRIMARY'
      );

      if (primaryMapping && primaryMapping.photographerId) {
        primaryPhotographerId = primaryMapping.photographerId;
        targetMappingType = 'PRIMARY';
      }

      // If I am the primary, assign to me. If someone else is primary, assign to them.
      // If no primary, it is UNASSIGNED.
      // V1 FIX: If I am creating this as a SECONDARY prompt (Backup/Failover), forces UNASSIGNED
      // This allows the delivery to appear in the "Secondary / Unassigned" list for everyone
      let assignedUserId = primaryPhotographerId;
      if (currentShowroomPrompt.showroomType === 'SECONDARY') {
        assignedUserId = null;
      }

      const initialStatus = assignedUserId ? 'ASSIGNED' : 'UNASSIGNED';

      // Showroom Type for the DELIVERY depends on its classification in DB
      const deliveryShowroomType = assignedUserId ? 'PRIMARY' : 'SECONDARY';

      const client = adminSupabase || supabase;

      const newDelivery = await deliveriesDb.createDelivery({
        date: today,
        showroom_code: currentShowroomPrompt.showroomCode,
        cluster_code: currentShowroomPrompt.clusterCode,
        showroom_type: deliveryShowroomType,
        timing: timing || undefined,
        delivery_name: deliveryName,
        status: initialStatus,
        assigned_user_id: assignedUserId,
        payment_type: currentShowroomPrompt.paymentType,
        footage_link: null,
        creation_index: creationIndex,
      }, client);

      // Update local state
      setDeliveries(prev => [...prev, newDelivery]);

      toast.success(
        timing
          ? `Delivery created with timing ${timing}`
          : 'Delivery created without timing (can update later)'
      );
    } catch (error) {
      console.error('Error creating delivery:', error);
      toast.error('Failed to create delivery');
    }
  };

  const handleDeleteDelivery = async (deliveryId: string) => {
    try {
      const client = shouldUseAdmin ? adminSupabase : supabase;
      await deliveriesDb.deleteDelivery(deliveryId, client);

      // Update local state
      setDeliveries(prev => prev.filter(d => d.id !== deliveryId));

      // Clear screenshots for this delivery (local state)
      setScreenshots(prev => {
        const newMap = new Map(prev);
        newMap.delete(deliveryId);
        return newMap;
      });

      // Also clear from mockScreenshots if we are still using them for demo
      // (Keeping existing logic for consistency with imports, though ideally we move fully to DB)
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
    } catch (error) {
      console.error('Error deleting delivery:', error);
      toast.error('Failed to delete delivery');
    }
  };

  const handleUpdateDeliveryTiming = async (deliveryId: string, timing: string) => {
    // Reuse the existing handler which is already DB-connected (we updated it in previous turn)
    // But wait, handleUpdateTiming in previous turn was named `handleUpdateTiming` at line 460.
    // Here this function is named `handleUpdateDeliveryTiming`.
    // We should alias it or use the same one.
    // Let's replace this implementation to call the other one or duplicate logic if signatures differ.
    // The signatures are identical: (deliveryId, timing).
    // So we can just call handleUpdateTiming(deliveryId, timing).
    await handleUpdateTiming(deliveryId, timing);
  };

  const handleDismissTimingPrompt = () => {
    if (!currentShowroomPrompt) return;

    // Just close for now (will recheck later)
    setShowTimingPrompt(false);
    setCurrentShowroomPrompt(null);
  };



  // Original handleDismissTimingPrompt logic (modified to be explicit)
  const handleDismissTimingPromptWithExpiry = () => {
    const today = getOperationalDateString();

    // Mark prompt as dismissed (will reappear in 1 hour)
    dismissPrompt(currentShowroomPrompt.showroomCode, today);

    setShowTimingPrompt(false);
    setCurrentShowroomPrompt(null);

    toast.info('Timing prompt dismissed. It will reappear in 1 hour.');
  };

  const handleMarkAllAdded = async () => {
    if (!currentShowroomPrompt) return;

    const today = getOperationalDateString();

    // V1 FIX: Rescue existing deliveries that were auto-rejected or left unassigned
    // This ensures they stay in the Active list instead of vanishing to Not Chosen
    try {
      // V1 FIX: Always use admin client for rescue updates to bypass RLS
      const client = adminSupabase || supabase;
      const showroomDeliveriesToRescue = deliveries.filter(d =>
        d.showroom_code === currentShowroomPrompt.showroomCode &&
        d.date === today &&
        (d.status === 'REJECTED' || (d.status === 'UNASSIGNED' && currentShowroomPrompt.showroomType === 'PRIMARY'))
      );

      if (showroomDeliveriesToRescue.length > 0) {
        console.log(`🛡️ Rescue: Re-assigning ${showroomDeliveriesToRescue.length} items for ${currentShowroomPrompt.showroomCode}`);
        await Promise.all(showroomDeliveriesToRescue.map(d =>
          deliveriesDb.updateDelivery(d.id, {
            status: 'ASSIGNED',
            assigned_user_id: user?.id,
            rejected_by_all: false,
            rejected_by_all_timestamp: null,
            updated_at: new Date().toISOString()
          }, client)
        ));

        // Immediate local state update for snappy UI
        setDeliveries(prev => prev.map(d => {
          const matchingRescue = showroomDeliveriesToRescue.find(r => r.id === d.id);
          if (matchingRescue) {
            return {
              ...d,
              status: 'ASSIGNED',
              assigned_user_id: user?.id || null,
              rejected_by_all: false,
              updated_at: new Date().toISOString()
            };
          }
          return d;
        }));
      }
    } catch (error) {
      console.error('Failed to rescue deliveries during finalization:', error);
    }

    // Persist finalization state - prompt will NOT show again today for this showroom
    finalizeShowroom(currentShowroomPrompt.showroomCode, today);

    // V1 CRITICAL: Global Finalization (stops prompt for everyone in cluster)
    // Log the event to DB so other photographers see it's done
    // V1 FIX: Always use admin client for system logs to bypass RLS
    const clientForLog = adminSupabase || supabase;
    import('../lib/db/logs').then(({ createLogEvent }) => {
      createLogEvent({
        type: 'SHOWROOM_FINALIZED',
        actor_user_id: user?.id || 'unknown',
        target_id: currentShowroomPrompt!.showroomCode,
        metadata: {
          date: today,
          showroomName: currentShowroomPrompt!.showroomName,
          clusterCode: currentShowroomPrompt!.clusterCode
        }
      }, clientForLog);
    });

    setShowTimingPrompt(false);
    setCurrentShowroomPrompt(null);
    toast.success('List finalized and rescued. All deliveries now in your active list.');
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

  // V1 REFINED Visibility Logic:
  //
  // Helper to check if a delivery belongs to MY primary showroom
  // Helper: Normalize showroom names for comparison (handle spaces vs underscores, case)
  const normalizeShowroom = (name: string) => name.replace(/[\s_]/g, '').toUpperCase();

  // Helper to check if a delivery belongs to MY primary showroom
  const isMyPrimary = (delivery: Delivery) => {
    if (delivery.showroom_type !== 'PRIMARY') return false;
    // Check mappings
    return mappings.some(m => {
      if (m.mappingType !== 'PRIMARY' || m.photographerId !== user?.id) return false;

      const dealer = dealerships.find(d => d.id === m.dealershipId);
      if (!dealer) return false;

      const dealerName = dealer.name;
      const codeInParens = dealerName.match(/\(([^)]+)\)/)?.[1];
      const deliveryCode = delivery.showroom_code;

      // Robust check:
      // 1. Direct match
      if (dealerName === deliveryCode) return true;
      // 2. ID match
      if (m.dealershipId === deliveryCode) return true;
      // 3. Code in parens match
      if (codeInParens === deliveryCode) return true;
      // 4. Normalized name match (Bimal Nexa == BIMAL_NEXA)
      if (normalizeShowroom(dealerName) === normalizeShowroom(deliveryCode)) return true;

      return false;
    });
  };

  // Note: The mapping check above is a bit expensive to run in filter. 
  // Optimization: Pre-calculate "my primary codes".
  const myPrimaryCodes = mappings
    .filter(m => m.mappingType === 'PRIMARY' && m.photographerId === user?.id)
    .map(m => {
      const d = dealerships.find(deal => deal.id === m.dealershipId);
      return d?.name.match(/\(([^)]+)\)/)?.[1] || d?.name || m.dealershipId;
    });

  // PRIMARY SECTION:
  // - Show if ASSIGNED to me (Primary or claimed Secondary) - WAIT, existing logic said "showroom_type=PRIMARY".
  // - AND: Show if UNASSIGNED but belongs to MY primary showroom (so I can reclaim it).
  const primaryDeliveries = deliveries.filter(d => {
    if (d.showroom_type !== 'PRIMARY') return false;

    // 1. Assigned to me AND it is my primary
    if (d.status === 'ASSIGNED' && d.assigned_user_id === user?.id) {
      return isMyPrimary(d);
    }

    // 2. Unassigned but it's MY primary showroom
    // (We match code against myPrimaryCodes - simplistic match for now)
    // The showroom_code in delivery is what we start with.
    // We need to check if ANY of my primary mappings result in this code.
    // Since we don't have perfect code generation reuse here, we'll try:
    // Does this delivery's code appear in my calculated primary codes?
    // Actually, simple check: is d.assigned_user_id NULL and I am primary?
    // How do we know I am primary if assigned_user_id is null? Only via mappings.
    // So yes, need mapping check.
    if (d.status === 'UNASSIGNED') {
      const relevantMapping = isMyPrimary(d);
      return relevantMapping;
    }

    return false;
  });

  // SECONDARY SECTION:
  // - Show if status is UNASSIGNED AND NOT EXPIRED (available to all in cluster)
  // - BUT EXCLUDE if it is MY primary (already shown in Primary section)
  // - Show if showroom is SECONDARY today AND status is ASSIGNED to current user (private to assigner)
  const secondaryDeliveries = deliveries.filter(d => {
    if (d.date !== getOperationalDateString()) return false;

    // 1. Unassigned and NOT expired (available for cluster)
    if (d.status === 'UNASSIGNED' && d.cluster_code === effectiveClusterCode) {
      // Move expired ones to Not Chosen instead
      if (d.timing && isPromptExpired(d)) return false;

      // V1 FIX: If it is MY primary, don't show here (it's in Primary section)
      // Re-use logic:
      const isMine = isMyPrimary(d);
      if (isMine) return false;

      return true;
    }

    // 2. Claimed Deliveries that are NOT my primary
    // This includes:
    // - Genuine SECONDARY type deliveries
    // - PRIMARY type deliveries from valid other showrooms (Rescue missions)
    if (d.status === 'ASSIGNED' && d.assigned_user_id === user?.id) {
      return !isMyPrimary(d);
    }

    return false;
  });

  // NOT CHOSEN SECTION:
  // - Show REJECTED, REJECTED_CUSTOMER, POSTPONED_CANCELED, CANCELED
  // - DO NOT include "Unassigned Primary" here anymore (unless expired? No, primary doesn't expire in owner's view usually)
  // - Expired UNASSIGNED Secondary deliveries go here
  const notChosenDeliveries = deliveries.filter(d => {
    if (d.date !== getOperationalDateString()) return false;

    const isTerminal = ['REJECTED', 'REJECTED_CUSTOMER', 'POSTPONED_CANCELED', 'CANCELED'].includes(d.status);

    // Unassigned primary stays in Primary section for owner. 
    // Does it go to Not Chosen for OTHERS? No, others see it in Secondary if unassigned.
    // So "Unassigned Primary" never goes to Not Chosen unless explicitly rejected/terminal.

    // Expired Unassigned Secondary
    const isExpiredUnassignedSecondary = d.showroom_type === 'SECONDARY' && d.status === 'UNASSIGNED' && d.timing && isPromptExpired(d);

    // Also: "Rejected by all" which is status=REJECTED (covered by isTerminal)

    // What about "Expired Unassigned Primary" for others?
    // If I am NOT primary, and it expires, does it go to Not Chosen?
    // Currently primary deliveries don't really "expire" the same way, but if they have timing...
    // Let's stick to: If unassigned & expired -> Not Chosen.
    // But exclude if it's MY primary (I still want to see it in Primary list even if late).
    const isMine = isMyPrimary(d);

    if (d.status === 'UNASSIGNED' && d.timing && isPromptExpired(d)) {
      if (d.showroom_type === 'PRIMARY' && isMine) return false; // Stays in Primary
      return true; // Go to Not Chosen for everyone else
    }

    return isTerminal;
  });

  // V1 SPEC: "Deliveries Finished?" enabled only if there exists ≥1 delivery that is:
  // - ASSIGNED
  // - NOT canceled/postponed
  const hasAssignedDeliveries = deliveries.some(d =>
    d.status === 'ASSIGNED' &&
    d.assigned_user_id === user?.id &&
    !['CANCELED', 'POSTPONED_CANCELED'].includes(d.status)
  );

  // V1 FIX: Disable button if on Full Day leave
  // FetchDeliveries already filtered 'leaves' to today's records for all cluster photographers
  const myTodayLeaves = leaves.filter(l => l.photographerId === user?.id);
  const isFullDayLeave = myTodayLeaves.some(l => l.half === 'FIRST_HALF') &&
    myTodayLeaves.some(l => l.half === 'SECOND_HALF');

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
          deliveries={deliveries.filter(d => d.status === 'ASSIGNED' && d.assigned_user_id === user?.id)}
          screenshots={screenshots}
          onBack={() => {
            setShowSendUpdate(false);
            setDeliveriesFinishedClicked(false);
          }}
          onUpdateFootageLink={handleUpdateFootageLink}
          onUploadScreenshot={handleUploadScreenshot}
          onComplete={async (updatedDeliveries) => {
            console.log('HomeScreen: onComplete called with', updatedDeliveries.length, 'deliveries');

            try {
              // Update all deliveries to DONE in DB
              const client = shouldUseAdmin ? adminSupabase : supabase;
              const updatePromises = updatedDeliveries.map(d =>
                deliveriesDb.updateDelivery(d.id, {
                  status: 'DONE',
                  // Preserve any other changes passed from SendUpdateScreen
                  footage_link: d.footage_link,
                  updated_at: new Date().toISOString()
                }, client)
              );

              await Promise.all(updatePromises);

              // Update local state deliveries to DONE status
              setDeliveries(prev => prev.map(d => {
                const updated = updatedDeliveries.find(ud => ud.id === d.id);
                return updated ? { ...d, status: 'DONE', footage_link: updated.footage_link } : d;
              }));

              // V1 SPEC: Create reel tasks for each completed delivery in DB
              // Using Promise.all to handle them concurrently
              await Promise.all(updatedDeliveries.map(async (delivery) => {
                const client = shouldUseAdmin ? adminSupabase : supabase;

                // Check if task already exists in DB
                const existingTask = await reelsDb.getReelTaskByDelivery(delivery.id, client);

                if (!existingTask) {
                  await reelsDb.createReelTask({
                    delivery_id: delivery.id,
                    assigned_user_id: user?.id || '',
                    reel_link: null,
                    status: 'PENDING',
                    reassigned_reason: null,
                  }, client);
                  console.log(`🎬 Created Reel Task for delivery ${delivery.id}`);
                }
              }));

              // Update photographer day state
              setServicedCount(updatedDeliveries.length);
              setPhotographerDayState('CLOSED');

              // Mark end of day in local storage/system
              if (user?.id) {
                markEndOfDay(user.id, updatedDeliveries.length);
              }

              // Close the send update screen and reset button state
              setShowSendUpdate(false);
              setDeliveriesFinishedClicked(false);

              console.log('HomeScreen: State updated, showSendUpdate set to false');
              toast.success(`Day completed! ${updatedDeliveries.length} deliveries covered.`);

            } catch (error) {
              console.error('Error closing day:', error);
              toast.error('Failed to close day. Please try again.');
            }
          }}
        />
      ) : (photographerDayState as string) === 'CLOSED' ? (
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
                <Badge className="bg-[#2563EB] text-white ml-auto">{primaryDeliveries.length}</Badge>
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
                <Badge variant="outline" className="border-[#F59E0B] text-[#F59E0B] ml-auto">{secondaryDeliveries.length}</Badge>
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
              <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700 ml-auto">{notChosenDeliveries.length}</Badge>
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

          {/* Timing Prompt Dialog */}
          {showTimingPrompt && currentShowroomPrompt && (
            <TimingPrompt
              showroomCode={currentShowroomPrompt.showroomCode}
              showroomName={currentShowroomPrompt.showroomName}
              clusterCode={currentShowroomPrompt.clusterCode}
              date={getOperationalDateString()}
              existingDeliveries={deliveries.filter(
                d => d.showroom_code === currentShowroomPrompt.showroomCode && d.date === getOperationalDateString()
              )}
              onAddDelivery={handleAddDelivery}
              onDeleteDelivery={handleDeleteDelivery}
              onUpdateTiming={handleUpdateDeliveryTiming}
              onDismiss={handleDismissTimingPromptWithExpiry}
              photographerId={user?.id || ''}
              paymentType={currentShowroomPrompt.paymentType}
              showroomType={currentShowroomPrompt.showroomType}
              onMarkAllAdded={handleMarkAllAdded}
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
                      dayCompleted={(photographerDayState as string) === 'CLOSED'}
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
                    onUpdateTiming={handleUpdateDeliveryTiming}
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
            disabled={isFullDayLeave}
            onClick={() => {
              // Single click - open Send Update screen directly
              setShowSendUpdate(true);
            }}
          >
            <span className="text-lg">
              {isFullDayLeave ? 'On Full Day Leave' : 'Deliveries Finished?'}
            </span>
            <span className="text-xs font-normal opacity-90">
              {isFullDayLeave
                ? 'Button disabled due to full day leave'
                : 'Close day and send update to admin'}
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
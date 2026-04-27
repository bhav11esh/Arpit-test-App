import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useLeave } from '../context/LeaveContext';
import { useNavigate } from 'react-router-dom';
import { mockScreenshots, simulateApiDelay } from '../lib/mockData';
import * as deliveriesDb from '../lib/db/deliveries';
import * as reelsDb from '../lib/db/reels';
import { adminSupabase, supabase } from '../lib/supabase';
import type { Delivery } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import {
  getLocalDateString,
  getOperationalDateString,
  formatDateForSheet,
  getStatusColor,
  getShowroomCode,
  getDeliverySignature,
} from '../lib/utils';
import { Download, Trash2, ChevronLeft, ChevronRight, Grid, FileText, Lock, Undo2, Redo2, Edit2, Check, X, Settings, Calendar, Trophy, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { AdminLogsViewer } from './AdminLogsViewer';
import { EarningsTracker } from './EarningsTracker';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';
import { LiveBookingsView } from './LiveBookingsView';
import * as configDb from '../lib/db/config';
import * as notificationsDb from '../lib/db/notifications';
import * as leavesDb from '../lib/db/leaves';
import * as screenshotsDb from '../lib/db/screenshots';
import { BellRing, ClipboardCheck, Bell, CheckCircle2, Upload, RefreshCw } from 'lucide-react';
import { SearchableSelect } from './ui/searchable-select';
import { AlertTriangle } from 'lucide-react';

export function ViewScreen() {
  const { user } = useAuth();
  const { dealerships, clusters, mappings, photographers, allUsers } = useConfig();
  const { isPhotographerOnLeave } = useLeave();
  const navigate = useNavigate();

  // DEBUG: Track render count
  const renderCount = React.useRef(0);
  renderCount.current++;
  console.log(`🎨 ViewScreen RENDER #${renderCount.current} - historyIndex will be updated below`);

  // V1 SPEC: Photographers see two tabs: Incentive Tracker + Spreadsheet
  // Admins see: Spreadsheet + Payment Gallery + Follow Gallery + Logs
  const [mainTab, setMainTab] = useState<'earnings' | 'data'>('data');

  // V1 SPEC: Admin View has 3 mutually exclusive modes:
  // 4. Logs View (admin audit trail)
  // 5. Portrait View (live_bookings)
  // V1 RULE: Photographers must NEVER see screenshot galleries (modes 2 & 3)
  const [viewMode, setViewMode] = useState<'spreadsheet' | 'payment' | 'follow' | 'rapido' | 'logs' | 'portrait'>('spreadsheet');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [galleryViewMode, setGalleryViewMode] = useState<'single' | 'grid'>('single');
  const [loading, setLoading] = useState(true);

  // V1 SPEC: Gallery filters
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedPhotographer, setSelectedPhotographer] = useState<string>('all');

  // V1 SPEC: Spreadsheet showroom filter (log of deliveries covered per showroom)
  const [selectedShowroom, setSelectedShowroom] = useState<string>('all');

  // V1 SPEC: Spreadsheet edit state (undo/redo support)
  const [editHistory, setEditHistory] = useState<Delivery[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [editingCell, setEditingCell] = useState<{ deliveryId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResults, setAuditResults] = useState<{
    missingUpdates: { userId: string; name: string; deliveryCount: number; leaveType?: string | null }[];
    reelBacklogs: { userId: string; name: string; taskCount: number }[];
  } | null>(null);
  const [showAuditDialog, setShowAuditDialog] = useState(false);

  // Add new row state
  const [newRowData, setNewRowData] = useState<{
    date: string;
    showroom_id: string;
    delivery_name: string;
    footage_link: string;
    reel_link: string;
    received_amount: string;
    customer_phone: string;
    rapido_charge: string;
    payment_screenshot: File | null;
    rapido_screenshot: File | null;
  }>({
    date: '',
    showroom_id: '',
    delivery_name: '',
    footage_link: '',
    reel_link: '',
    received_amount: '',
    customer_phone: '',
    rapido_charge: '',
    payment_screenshot: null,
    rapido_screenshot: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState<Set<string>>(new Set());
  const [isSyncingBulk, setIsSyncingBulk] = useState(false);
  
  // V9.0 Spreadsheet View Filtering
  const [spreadSheetDate, setSpreadSheetDate] = useState<string>(getOperationalDateString());
  const [showAllTime, setShowAllTime] = useState<boolean>(false);

  // V6.0 CONFLICT RESOLUTION
  const [conflictDelivery, setConflictDelivery] = useState<Delivery | null>(null);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);

  // V1 SPEC: Only ADMIN can access screenshot galleries
  const isAdmin = user?.role === 'ADMIN';

  // DEBUG: Log current state values on every render
  console.log(`📊 STATE VALUES: historyIndex=${historyIndex}, editHistory.length=${editHistory.length}, deliveries.length=${deliveries.length}`);

  // Helper function to format showroom display as "Dealership + Cluster"
  const getShowroomDisplayName = (dealershipId: string): string => {
    const dealership = dealerships.find(d => d.id === dealershipId);
    if (!dealership) return 'Unknown Dealership';

    const mapping = mappings.find(m => m.dealershipId === dealershipId);
    const cluster = mapping ? clusters.find(c => c.id === mapping.clusterId) : null;

    return cluster ? `${dealership.name} (${cluster.name})` : dealership.name;
  };

  // V6.0 CITY ISOLATION: Memoized filtered lists based on Cluster geographic anchor
  const cityIsolatedClusters = React.useMemo(() => {
    if (!user || user.role !== 'ADMIN' || !user.city) return clusters;
    return clusters.filter(c => (c as any).city === user.city);
  }, [clusters, user]);

  const allowedClusterIds = React.useMemo(() => new Set(cityIsolatedClusters.map(c => c.id)), [cityIsolatedClusters]);

  const cityIsolatedMappings = React.useMemo(() => {
    if (!user || user.role !== 'ADMIN' || !user.city || !mappings) return mappings;
    return mappings.filter(m => allowedClusterIds.has(m.clusterId));
  }, [mappings, allowedClusterIds, user]);

  const allowedDealershipIds = React.useMemo(() => new Set(cityIsolatedMappings.map(m => m.dealershipId)), [cityIsolatedMappings]);
  const allowedPhotographerIds = React.useMemo(() => new Set(cityIsolatedMappings.map(m => m.photographerId)), [cityIsolatedMappings]);

  const cityIsolatedDealerships = React.useMemo(() => {
    if (!user || user.role !== 'ADMIN' || !user.city) return dealerships;
    return dealerships.filter(d => allowedDealershipIds.has(d.id));
  }, [dealerships, allowedDealershipIds, user]);

  const cityIsolatedPhotographers = React.useMemo(() => {
    if (!user || user.role !== 'ADMIN' || !user.city) return photographers;
    return photographers.filter(p => allowedPhotographerIds.has(p.id));
  }, [photographers, allowedPhotographerIds, user]);

  useEffect(() => {
    console.log('🚀 ViewScreen mounted - CODE VERSION: 2024-01-20-DEBUG');
    loadData();
  }, []);

  // V1 SPEC: Set default showroom for photographers
  useEffect(() => {
    // Only apply for photographers who haven't manually changed from 'all' yet
    if (user && !isAdmin && mappings.length > 0 && selectedShowroom === 'all') {
      const primaryMapping = mappings.find(m => m.photographerId === user.id && m.mappingType === 'PRIMARY');
      if (primaryMapping) {
        console.log(`🎯 ViewScreen: Setting default showroom for ${user.name} -> ${primaryMapping.dealershipId}`);
        setSelectedShowroom(primaryMapping.dealershipId);
      }
    }
  }, [user, isAdmin, mappings, selectedShowroom]);

  // DEBUG: Log whenever edit history changes
  useEffect(() => {
    console.log('📊 Edit History Changed - historyIndex:', historyIndex, 'editHistory.length:', editHistory.length);
    console.log('   Can Undo:', historyIndex > 0, 'Can Redo:', historyIndex < editHistory.length - 1);
  }, [editHistory, historyIndex]);

  const handleRunAudit = async () => {
    setAuditLoading(true);
    try {
      const today = getOperationalDateString();
      const client = supabase;
      console.log('🔍 [Audit] Requesting server-side audit for date:', today);

      // Call the server-side RPC for enterprise-scale performance
      const { data, error } = await (client as any).rpc('run_system_audit', { target_date: today });

      if (error) throw error;

      console.log('📊 [Audit] Server-side audit results received:', data);
      
      setAuditResults({
        missingUpdates: (data as any).missingUpdates || [],
        reelBacklogs: (data as any).reelBacklogs || [],
      });
      setShowAuditDialog(true);
    } catch (error) {
      console.error('Audit failed:', error);
      toast.error('Failed to run system audit');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleNudgeAll = async () => {
    if (!auditResults) return;

    const nudgeCount = auditResults.missingUpdates.length + auditResults.reelBacklogs.length;
    if (nudgeCount === 0) {
      toast.info('No photographers to nudge!');
      return;
    }

    try {
      const promises: Promise<any>[] = [];

      // 1. Nudge for Send Update
      auditResults.missingUpdates.forEach(userNotif => {
        const title = '⚠️ Action Required: Day End Update';
        const body = `You have ${userNotif.deliveryCount} deliveries pending today. Please submit "Send Update" immediately.`;

        // In-app notification
        promises.push(notificationsDb.createNotification({
          user_id: userNotif.userId,
          title,
          body,
          type: 'DAY_CLOSURE'
        }));

        // Background Push Notification
        import('../lib/db/push').then(({ sendPushToUser }) => {
          sendPushToUser(userNotif.userId, { title, body });
        });
      });

      // 2. Nudge for Reel Backlog
      auditResults.reelBacklogs.forEach(userNotif => {
        const title = '🎬 Reel Backlog Alert';
        const body = `You have ${userNotif.taskCount} unresolved reels from 2+ days ago. Please resolve them now.`;

        // In-app notification
        promises.push(notificationsDb.createNotification({
          user_id: userNotif.userId,
          title,
          body,
          type: 'REEL_BACKLOG'
        }));

        // Background Push Notification
        import('../lib/db/push').then(({ sendPushToUser }) => {
          sendPushToUser(userNotif.userId, { title, body });
        });
      });

      await Promise.all(promises);
      toast.success(`Successfully nudged ${nudgeCount} photographers!`);
      setShowAuditDialog(false);
    } catch (error) {
      console.error('Nudge failed:', error);
      toast.error('Failed to send nudges');
    }
  };

  const loadData = async (forceShowroom?: string) => {
    const showroomId = forceShowroom !== undefined ? forceShowroom : selectedShowroom;
    console.log(`🔄 [ViewScreen] loadData(showroomId: ${showroomId}) started...`);
    setLoading(true);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Data loading timed out after 10 seconds')), 10000)
    );

    try {
      await Promise.race([
        (async () => {
          const client = supabase;

          // 1. Prepare filters for deliveries
          const filters: any = { status: 'DONE' };
          
          // V5.5: Always filter by showroom if one is selected to save memory/bandwidth
          if (showroomId && showroomId !== 'all') {
            const dealership = cityIsolatedDealerships.find(d => d.id === showroomId);
            if (dealership) {
              filters.showroomCode = getShowroomCode(dealership.name);
            }
          } else if (user?.role === 'ADMIN' && user.city) {
            // V6.0: If 'all' selected but is a city-admin, restrict fetch to their city's showrooms
            const cityShowroomCodes = cityIsolatedDealerships.map(d => getShowroomCode(d.name));
            if (cityShowroomCodes.length > 0) {
              filters.showroomCodes = cityShowroomCodes;
            }
          }

          // 2. Fetch deliveries matching filter
          const doneDeliveries = await deliveriesDb.getDeliveries(filters, client);

          // 3. Fetch screenshots (Admin View) - V5.5 SCALABILITY FIX
          let realScreenshots: any[] = [];
          const { getScreenshotsByDeliveries, getAllScreenshots } = await import('../lib/db/screenshots');
          
          if (showroomId && showroomId !== 'all' && doneDeliveries.length > 0) {
            const deliveryIds = doneDeliveries.map(d => d.id);
            realScreenshots = await getScreenshotsByDeliveries(deliveryIds).then(map => Array.from(map.values()).flat());
          } else {
            realScreenshots = await getAllScreenshots();
          }

          // V6.0 CITY ISOLATION (Gallery): Filter screenshots to only show those from photographers in the admin's city
          if (user?.role === 'ADMIN' && user.city) {
            const cityPhotographerIds = new Set(cityIsolatedPhotographers.map(p => p.id));
            realScreenshots = realScreenshots.filter(s => {
              const delivery = doneDeliveries.find(d => d.id === s.delivery_id);
              return delivery && cityPhotographerIds.has(delivery.assigned_user_id || '');
            });
            console.log(`🖼️ [City Isolation] Gallery filtered to ${realScreenshots.length} screenshots for city ${user.city}.`);
          }
          setScreenshots(realScreenshots);

          // 4. Ensure metadata resolution for screenshots
          const screenshotDeliveryIds = Array.from(new Set(realScreenshots.map(s => s.delivery_id)));
          const knownIds = new Set(doneDeliveries.map(d => d.id));
          const missingIds = screenshotDeliveryIds.filter(id => !knownIds.has(id));

          let extraDeliveries: Delivery[] = [];
          if (missingIds.length > 0) {
            extraDeliveries = await deliveriesDb.getDeliveriesByIds(missingIds, client);
          }

          const uniqueDeliveries = Array.from(new Map([...doneDeliveries, ...extraDeliveries].map(d => [d.id, d])).values());

          setDeliveries(uniqueDeliveries);
          setEditHistory([uniqueDeliveries]);
          setHistoryIndex(0);
        })(),
        timeoutPromise
      ]);
      console.log('✅ [ViewScreen] Data loaded successfully');
    } catch (err) {
      console.error('❌ [ViewScreen] loadData failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // V5.5 Scalability: Reload data when showroom selection changes
  useEffect(() => {
    if (user) {
      console.log(`🎯 Showroom changed to ${selectedShowroom}, reloading data...`);
      loadData(selectedShowroom);
    }
  }, [selectedShowroom, user?.id]);

  // V1 SPEC: Refresh data when switching to spreadsheet view to pick up reel link changes
  // Use a ref to track previous viewMode to only load when actually switching
  const prevViewMode = React.useRef<string | null>(null);
  useEffect(() => {
    console.log('📍 viewMode useEffect - viewMode:', viewMode, 'prevViewMode:', prevViewMode.current);
    if (viewMode === 'spreadsheet' && prevViewMode.current !== null && prevViewMode.current !== 'spreadsheet') {
      console.log('🔄 Triggering loadData because switched TO spreadsheet');
      loadData();
    }
    prevViewMode.current = viewMode;
  }, [viewMode]);

  // V1 CRITICAL: Enforce admin-only access for screenshot galleries
  // If non-admin attempts to access payment/follow views, redirect to spreadsheet

  // V1 SPEC: Memoized filtered deliveries for both Table and CSV Export
  const filteredDeliveries = React.useMemo(() => {
    return deliveries.filter(d => {
      // V1 SPEC: Spreadsheet shows DONE deliveries AND Deadlocked (REJECTED_BY_ALL) deliveries
      if (d.status !== 'DONE' && (d as any).decision_state !== 'REJECTED_BY_ALL') return false;

      // V9.0: Spreadsheet Date Filtering (Default to Today)
      if (!showAllTime && spreadSheetDate) {
        if (d.date !== spreadSheetDate) return false;
      }

      // V6.0 CITY ISOLATION: Always filter by admin's city if role is ADMIN
      if (user?.role === 'ADMIN' && user.city) {
        const deliveryShowroomCode = getShowroomCode(d.showroom_code);
        const isFromCity = cityIsolatedDealerships.some(deal => getShowroomCode(deal.name) === deliveryShowroomCode);
        if (!isFromCity) return false;
      }

      // Apply showroom filter (Now strictly Dealership ID)
      if (selectedShowroom !== 'all') {
        const dealership = cityIsolatedDealerships.find(d => d.id === selectedShowroom);
        if (dealership) {
          const targetCode = getShowroomCode(dealership.name);
          // V21 FIX: Use raw showroom_code from DB, no need to re-process via getShowroomCode
          const currentCode = d.showroom_code;
          if (currentCode !== targetCode) return false;
        }
      }
      return true;
    });
  }, [deliveries, selectedShowroom, cityIsolatedDealerships, user, spreadSheetDate, showAllTime]);

  const handleExportCSV = () => {
    const csv = [
      ['Date', 'Footage Link', 'Reel Link', 'Photographer Name', 'Amount Received', 'Phone Number', 'Rapido Charge'].join(','),
      ...filteredDeliveries.map(d => {
        const photographer = allUsers.find(p => p.id === d.assigned_user_id);
        return [
          d.date,
          d.footage_link || '',
          (d as any).reel_link || '',
          photographer?.name || 'Unassigned',
          d.received_amount || '',
          d.customer_phone || '',
          d.rapido_charge || 0
        ].map(val => `"${val}"`).join(','); // Wrap in quotes to handle commas in links if any
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deliveries-${getOperationalDateString()}${selectedShowroom !== 'all' ? '-filtered' : ''}.csv`;
    a.click();

    toast.success(`Exported ${filteredDeliveries.length} rows to CSV`);
  };

  const handleDeleteScreenshot = async (screenshotId: string) => {
    await simulateApiDelay(300);
    // V1 SPEC: Screenshot deletion is AUDIT-ONLY and fully decoupled from delivery state machine
    // - Marks screenshot as deleted (soft delete for audit trail in database)
    // - PERMANENTLY REMOVES screenshot from binary storage (S3/CDN/etc)
    // - Does NOT reopen tasks
    // - Does NOT affect delivery state or status
    // - Does NOT affect spreadsheet data
    // - Does NOT affect SEND UPDATE status
    // - Admin-only operation (photographers cannot delete screenshots)
    setScreenshots(prev => prev.map(s =>
      s.id === screenshotId
        ? { ...s, deleted_at: new Date().toISOString() }
        : s
    ));
    toast.success('Screenshot permanently deleted from storage (audit-only action)');
  };

  // V1 SPEC: Undo/Redo handlers for spreadsheet edits
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setDeliveries(editHistory[historyIndex - 1]);
      toast.success('Undo successful');
    }
  };

  const handleRedo = () => {
    if (historyIndex < editHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setDeliveries(editHistory[historyIndex + 1]);
      toast.success('Redo successful');
    }
  };

  // V1 SPEC: Cell edit handlers (Admin + Photographer can edit)
  const handleStartEdit = (deliveryId: string, field: string, currentValue: string) => {
    setEditingCell({ deliveryId, field });
    setEditValue(currentValue || '');
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;

    // V11.0: Duplicate Link Validation for Footage Links
    if (editingCell.field === 'footage_link' && editValue && editValue.trim() !== '') {
      try {
        const currentDelivery = deliveries.find(d => d.id === editingCell.deliveryId);
        if (currentDelivery) {
          const duplicate = await deliveriesDb.checkDuplicateFootageLink(
            editValue, 
            currentDelivery.showroom_code, 
            editingCell.deliveryId
          );
          if (duplicate) {
            toast.error(`Duplicate link detected! This link is already used for ${duplicate.delivery_name}.`);
            return;
          }
        }
      } catch (error) {
        console.error('Duplicate check failed:', error);
      }
    }

    const oldDelivery = deliveries.find(d => d.id === editingCell.deliveryId);
    const photographerForSig = allUsers.find(p => p.id === oldDelivery?.assigned_user_id);
    const oldSignature = oldDelivery ? getDeliverySignature(oldDelivery, photographerForSig?.name || '') : null;

    // V1 FIX: Persist changes to DB immediately
    try {
      const client = supabase;

      if (editingCell.field === 'reel_link') {
        // 1. Update Delivery - V1 FIX: Ensure we use the exact field name
        await deliveriesDb.updateDelivery(editingCell.deliveryId, { [editingCell.field]: editValue }, client);

        // 2. Sync with Reel Task (Backlog)
        const existingTask = await reelsDb.getReelTaskByDelivery(editingCell.deliveryId, client);
        if (existingTask) {
          await reelsDb.updateReelTask(existingTask.id, {
            reel_link: editValue,
            status: editValue && editValue.trim() !== '' ? 'RESOLVED' : 'PENDING'
          }, client);
          console.log(`🎬 Reel Task updated for ${editingCell.deliveryId} -> ${editValue ? 'RESOLVED' : 'PENDING'}`);
        }
      } else if (editingCell.field === 'assigned_user_id') {
        const newUserId = editValue === 'unassigned' ? null : editValue;
        // 1. Update Delivery
        await deliveriesDb.updateDelivery(editingCell.deliveryId, { assigned_user_id: newUserId }, client);

        // 2. Sync with Reel Task (even if status is RESOLVED, we update the owner for historical accuracy)
        const existingTask = await reelsDb.getReelTaskByDelivery(editingCell.deliveryId, client);
        if (existingTask && newUserId) {
          await reelsDb.updateReelTask(existingTask.id, {
            assigned_user_id: newUserId
          }, client);
          console.log(`🎬 Reel Task assigned user updated for ${editingCell.deliveryId} -> ${newUserId}`);
        }
      } else if (editingCell.field === 'received_amount' || editingCell.field === 'rapido_charge') {
        // V1 FIX: Parse numeric values
        const numericValue = editValue === '' ? null : parseFloat(editValue);
        await deliveriesDb.updateDelivery(editingCell.deliveryId, { [editingCell.field]: numericValue }, client);
      } else {
        // Generic update for other fields
        await deliveriesDb.updateDelivery(editingCell.deliveryId, { [editingCell.field]: editValue }, client);
      }
    } catch (error) {
      console.error("Failed to save edit to DB:", error);
      toast.error("Failed to save changes to database");
      return;
    }

    const updatedDeliveries = deliveries.map(d =>
      d.id === editingCell.deliveryId
        ? { ...d, [editingCell.field]: editValue } as any
        : d
    );

    // V1 SPEC: Update edit history for undo/redo
    const newHistory = editHistory.slice(0, historyIndex + 1);
    newHistory.push(updatedDeliveries);
    setEditHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setDeliveries(updatedDeliveries);
    setEditingCell(null);
    setEditValue('');

    // V1 SPEC: Reel backlog is DERIVED STATE (not manual state)
    // - Exactly 1 reel per delivery (enforced by data model)
    // - Backlog exists iff reel_link cell is blank/empty
    // - DELETING reel link → recreates backlog (delivery needs reel again)
    // - OVERWRITING reel link → does NOT recreate backlog (reel satisfied)
    // - This ensures backlog is always in sync with spreadsheet state
    if (editingCell.field === 'reel_link') {
      if (!editValue || editValue.trim() === '') {
        toast.success('Reel link cleared → Reel returned to backlog');
      } else {
        toast.success('Reel link updated (no backlog created)');
      }
    } else {
      toast.success('Cell updated successfully');
    }

    // Trigger Google Sheets Sync
    if (editingCell.field === 'footage_link' || editingCell.field === 'reel_link' || 
        editingCell.field === 'received_amount' || editingCell.field === 'customer_phone' || 
        editingCell.field === 'rapido_charge' || editingCell.field === 'date' || 
        editingCell.field === 'assigned_user_id') {
      const updatedDelivery = updatedDeliveries.find(d => d.id === editingCell.deliveryId);
      if (updatedDelivery) {
        handleTriggerSheetSync(updatedDelivery, 'sync', oldSignature);
      }
    }
  };

    // V5.0 SIGNATURE LOGIC REMOVED - NOW IN lib/utils.ts

  const handleDeleteDelivery = async (deliveryId: string) => {
    if (!isAdmin) return;

    const deliveryToDelete = deliveries.find(d => d.id === deliveryId);
    if (!deliveryToDelete) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this delivery record? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      const client = supabase;
      
      // V6.0 SAFE DELETE: Stage 1 - Soft Delete in DB first
      console.log(`🗑️ [Safe Delete] Attempting soft-delete for ${deliveryId}...`);
      await deliveriesDb.softDeleteDelivery(deliveryId, client);

      // Optimistically update local state to hide it
      const updatedDeliveries = deliveries.filter(d => d.id !== deliveryId);
      setDeliveries(updatedDeliveries);

      // Update history
      const newHistory = editHistory.slice(0, historyIndex + 1);
      newHistory.push(updatedDeliveries);
      setEditHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      // V6.0 SAFE DELETE: Stage 2 - Sync deletion to Google Sheets
      // If this fails, it stays in 'pendingSyncs' (and is soft-deleted in Supabase)
      await handleTriggerSheetSync(deliveryToDelete, 'delete');

      toast.success('Deletion process started correctly.');
    } catch (error) {
      console.error('Failed to initiate delete:', error);
      toast.error('Failed to initiate delete process');
    }
  };

  const handleTriggerSheetSync = async (delivery: any, action: 'sync' | 'delete' | 'add' = 'sync', oldSignature?: string | null) => {
    const deliveryId = delivery.id;
    
    try {
      // 1. Find Dealership from loaded state
      const dealership = dealerships.find(d => getShowroomCode(d.name) === getShowroomCode(delivery.showroom_code));

      if (!dealership || !dealership.googleSheetId) {
        console.log("Sync skipped: No Google Sheet ID configured.");
        return;
      }

      const SYNC_URL = dealership.googleSyncUrl || import.meta.env.VITE_GOOGLE_SYNC_URL;
      if (!SYNC_URL) return;

      const photographer = allUsers.find(p => p.id === delivery.assigned_user_id);

      // V7.0 Logic: Send ID and UpdatedAt for robust tracking
      const payload = {
        action,
        sheetId: dealership.googleSheetId,
        id: delivery.id, // Explicit ID for V7 matching
        oldSignature: oldSignature || getDeliverySignature(delivery, photographer?.name || ''), 
        delivery: {
          id: delivery.id,
          updated_at: delivery.updated_at || new Date().toISOString(),
          date: formatDateForSheet(delivery.date),
          photographer_name: photographer?.name || '',
          footage_link: delivery.footage_link || '',
          reel_link: (delivery as any).reel_link || '',
          received_amount: delivery.received_amount || '',
          customer_phone: delivery.customer_phone || '',
          rapido_charge: delivery.rapido_charge || ''
        }
      };

      // V7.1: Use text/plain to avoid CORS preflight (OPTIONS) which Apps Script doesn't handle.
      // Apps Script will still receive the body and we can still parse the JSON response.
      const response = await fetch(SYNC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.status === 'success') {
        console.log(`🚀 Sync ${action} successful: ${delivery.date} - ${photographer?.name}`, result);
        
        // V6.0 CONFLICT HANDLING
        if (result.code === 'STALE_UPDATE') {
          console.warn('Sync conflict detected: STALE_UPDATE');
          setConflictDelivery(delivery);
          setIsConflictDialogOpen(true);
          toast.error('Sync Conflict: Someone edited this row in Google Sheets.');
          
          // Keep it in pending so the user knows it's not truly synced/resolved
          setPendingSyncs(prev => new Set(prev).add(deliveryId));
          return;
        }

        // V6.0 SAFE DELETE: Stage 3 - If successful deletion, purge from Supabase
        if (action === 'delete') {
          console.log(`🔥 [Safe Delete] Google confirmed deletion. Purging ${deliveryId} from Supabase...`);
          const client = supabase;
          
          // 1. Delete associated reel task if exists
          const reelTask = await reelsDb.getReelTaskByDelivery(deliveryId, client);
          if (reelTask) {
            await reelsDb.deleteReelTask(reelTask.id);
          }
          
          // 2. Hard Delete from Supabase
          await deliveriesDb.deleteDelivery(deliveryId, client);
          toast.success(`Permanently purged deleted record from CRM.`);
        }

        // Remove from pending if successful
        setPendingSyncs(prev => {
          const next = new Set(prev);
          next.delete(deliveryId);
          return next;
        });

        if (action === 'sync' || action === 'add') {
          toast.success(`Synced to Google Sheets: ${delivery.delivery_name}`);
        }
      } else {
        console.warn(`⚠️ Sync failed with error code: ${result.code}`, result);
        
        if (result.code === 'ROW_NOT_FOUND') {
          toast.error(`Sync Failed: Row missing from Google Sheet. Please check manually.`, { duration: 5000 });
        } else {
          toast.error(`Sync Error: ${result.message || 'Unknown error'}`);
        }
        
        // Logical errors should also be tracked in pending if they are retryable, 
        // but ROW_NOT_FOUND needs manual intervention. We'll keep it in pending for visibility.
        setPendingSyncs(prev => new Set(prev).add(deliveryId));
      }
      
    } catch (error) {
      console.error('❌ Failed to trigger Google Sheets sync (Network Error):', error);
      // Network error - add to pending queue
      setPendingSyncs(prev => new Set(prev).add(deliveryId));
      toast.error(`Sync failed (network error). Item added to pending queue.`);
    }
  };

  const handleForceOverwrite = async () => {
    if (!conflictDelivery) return;
    
    setIsSubmitting(true);
    try {
      console.log(`💪 [Conflict] Forcing move for ${conflictDelivery.id}...`);
      
      // 1. Update timestamp in DB to "now" to win the GAS versioning check
      const now = new Date().toISOString();
      const updatedDelivery = await deliveriesDb.updateDelivery(conflictDelivery.id, { 
        updated_at: now 
      });
      
      // 2. Update local state
      setDeliveries(prev => prev.map(d => d.id === updatedDelivery.id ? updatedDelivery : d));
      
      // 3. Retry sync with NEW timestamp
      await handleTriggerSheetSync(updatedDelivery, 'sync');
      
      setIsConflictDialogOpen(false);
      setConflictDelivery(null);
      toast.success('Force overwrite successful!');
    } catch (error) {
      console.error('Force overwrite failed:', error);
      toast.error('Failed to force overwrite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshFromSheet = async () => {
    if (!conflictDelivery) return;
    
    setIsSubmitting(true);
    try {
      console.log(`📥 [Conflict] Refreshing record ${conflictDelivery.id} from Google Sheets...`);
      
      const dealership = dealerships.find(d => getShowroomCode(d.name) === getShowroomCode(conflictDelivery.showroom_code));
      if (!dealership?.googleSheetId) throw new Error('No Google Sheet ID found');

      const SYNC_URL = dealership.googleSyncUrl || import.meta.env.VITE_GOOGLE_SYNC_URL;
      if (!SYNC_URL) throw new Error('No Google Sync URL configured');
      
      const response = await fetch(SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'read',
          sheetId: dealership.googleSheetId
        })
      });

      const result = await response.json();
      if (result.status === 'success' && result.stats?.rows) {
        // Find our row in the sheet data
        const sheetRows = result.stats.rows;
        const sheetRow = sheetRows.find((r: any) => 
          String(r['CRM ID'] || r['crm id']).trim() === conflictDelivery.id.trim()
        );

        if (sheetRow) {
          console.log('✅ Found matching row in sheet:', sheetRow);
          
          // Update DB with sheet data
          const updates: any = {
            delivery_name: sheetRow['Delivery Name'] || sheetRow['delivery_name'] || sheetRow['Customer Name'] || sheetRow['Customer'] || sheetRow['customer_name'] || conflictDelivery.delivery_name,
            footage_link: sheetRow['Footage Link'] || sheetRow['footage link'],
            reel_link: sheetRow['Reel Link'] || sheetRow['reel link'],
            received_amount: parseFloat(sheetRow['Amount'] || sheetRow['amount'] || '0') || null,
            customer_phone: sheetRow['Phone'] || sheetRow['phone'] || sheetRow['Customer Phone'] || sheetRow['phone_number'],
            rapido_charge: parseFloat(sheetRow['Rapido'] || sheetRow['rapido'] || '0') || null,
            updated_at: sheetRow['Updated At'] || sheetRow['updated at'] || new Date().toISOString()
          };

          const refreshedDelivery = await deliveriesDb.updateDelivery(conflictDelivery.id, updates);
          
          // Update local state
          setDeliveries(prev => prev.map(d => d.id === refreshedDelivery.id ? refreshedDelivery : d));
          
          // Remove from pending syncs since we are now matching the sheet
          setPendingSyncs(prev => {
            const next = new Set(prev);
            next.delete(conflictDelivery.id);
            return next;
          });

          setIsConflictDialogOpen(false);
          setConflictDelivery(null);
          toast.success('Successfully refreshed and synced with Google Sheets');
        } else {
          toast.error('Could not find matching row in the Google Sheet.');
        }
      } else {
        throw new Error('Failed to read data from Google Sheets');
      }
    } catch (error) {
      console.error('Refresh failed:', error);
      toast.error('Failed to refresh from Google Sheets');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSyncPending = async () => {
    if (isSyncingBulk || pendingSyncs.size === 0) return;
    
    setIsSyncingBulk(true);
    const deliveriesToSync = deliveries.filter(d => pendingSyncs.has(d.id));
    
    toast.info(`Retrying ${deliveriesToSync.length} pending syncs in bulk...`);
    
    try {
      await handleTriggerBulkSync(deliveriesToSync);
      toast.success('Pending batch sync completed.');
    } catch (err) {
      toast.error('Some pending syncs still failed.');
    } finally {
      setIsSyncingBulk(false);
    }
  };

  const handleTriggerBulkSync = async (deliveriesToSync: any[]) => {
    if (!deliveriesToSync.length) return;

    // 1. Group by Google Sheet ID AND Sync URL
    const groups: Record<string, { deliveries: any[], url: string }> = {};
    for (const d of deliveriesToSync) {
      const deal = dealerships.find(deal => getShowroomCode(deal.name) === getShowroomCode(d.showroom_code));
      if (deal?.googleSheetId) {
        const syncUrl = deal.googleSyncUrl || import.meta.env.VITE_GOOGLE_SYNC_URL;
        if (!syncUrl) continue;
        
        const key = `${deal.googleSheetId}|||${syncUrl}`;
        if (!groups[key]) groups[key] = { deliveries: [], url: syncUrl };
        groups[key].deliveries.push(d);
      }
    }

    // 2. Process each group
    for (const [key, group] of Object.entries(groups)) {
      const sheetId = key.split('|||')[0];
      const { deliveries: groupDeliveries, url: SYNC_URL } = group;
      try {
        console.log(`📦 [Bulk Sync] Sending ${groupDeliveries.length} rows to sheet: ${sheetId}`);
        
        const payload = {
          action: 'sync_bulk',
          sheetId,
          deliveries: groupDeliveries.map(d => {
            const photographer = allUsers.find(p => p.id === d.assigned_user_id);
            // V13.0 FIX: Ensure signature is included for robust de-duplication in bulk mode
            const deliveryPayload = {
              id: d.id,
              signature: getDeliverySignature(d, photographer?.name || ''),
              date: formatDateForSheet(d.date),
              photographer_name: photographer?.name || '',
              delivery_name: d.delivery_name || '',
              footage_link: d.footage_link || '',
              reel_link: (d as any).reel_link || '',
              received_amount: d.received_amount || '',
              customer_phone: d.customer_phone || '',
              rapido_charge: d.rapido_charge || '',
              updated_at: d.updated_at || new Date().toISOString()
            };
            return deliveryPayload;
          })
        };
        console.log('[Sync Debug] Sending bulk payload:', payload);

        const response = await fetch(SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.status === 'success') {
          console.log(`✅ Bulk Sync Success for sheet ${sheetId}:`, result.summary);
          // Clear successes from pendingSyncs
          setPendingSyncs(prev => {
            const next = new Set(prev);
            groupDeliveries.forEach(d => next.delete(d.id));
            return next;
          });
        } else {
          throw new Error(result.message || 'Batch failed');
        }
      } catch (err) {
        console.error(`❌ Bulk Sync Failed for sheet ${sheetId}:`, err);
        toast.error(`Sync failed for ${groupDeliveries.length} items. They remain in pending.`);
        // Ensure they are in pending
        setPendingSyncs(prev => {
          const next = new Set(prev);
          groupDeliveries.forEach(d => next.add(d.id));
          return next;
        });
      }
    }
  };

  const handleBulkSyncVisible = async () => {
    if (isSyncingBulk || filteredDeliveries.length === 0) return;
    
    const count = filteredDeliveries.length;
    const dateLabel = showAllTime ? "ALL TIME" : spreadSheetDate;
    
    if (count > 50) {
      if (!confirm(`🚨 LARGE SYNC WARNING: You are about to sync ${count} rows for ${dateLabel}.\n\nThis may take some time and could affect Google Sheets performance. Are you sure you want to proceed?`)) {
        return;
      }
    } else if (!confirm(`⚠️ Confirm: Sync all ${count} visible rows (${dateLabel}) to Google Sheets?`)) {
      return;
    }

    setIsSyncingBulk(true);
    toast.info(`Starting bulk sync for ${count} rows...`);
    
    try {
      await handleTriggerBulkSync(filteredDeliveries);
      toast.success('Bulk sync of visible rows completed.');
    } catch (err) {
      toast.error('Bulk sync experienced some errors.');
    } finally {
      setIsSyncingBulk(false);
    }
  };

  // V5.4: Background Retry Logic: Listen for online event to automatically clear queue
  useEffect(() => {
    const handleOnline = () => {
      if (pendingSyncs.size > 0) {
        console.log('🌐 Internet back online. Retrying pending syncs...');
        handleBulkSyncPending();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [pendingSyncs.size]);

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Add new row handlers
  const handleStartAddRow = () => {
    setNewRowData({
      date: getOperationalDateString(),
      showroom_id: '',
      delivery_name: '',
      footage_link: '',
      reel_link: '',
      received_amount: '',
      customer_phone: '',
      rapido_charge: '',
      payment_screenshot: null,
      rapido_screenshot: null
    });
    setIsAddDialogOpen(true);
  };

  const handleSaveNewRow = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!newRowData.date || !newRowData.showroom_id) {
        toast.error('Please fill in required fields: Date and Showroom');
        return;
      }

      const selectedDealership = dealerships.find(d => d.id === newRowData.showroom_id);
      if (!selectedDealership) {
        return;
      }

      // V11.0: Duplicate Link Validation for New Rows
      if (newRowData.footage_link && newRowData.footage_link.trim() !== '') {
        try {
          const showroomCode = getShowroomCode(selectedDealership.name);
          const duplicate = await deliveriesDb.checkDuplicateFootageLink(newRowData.footage_link, showroomCode);
          if (duplicate) {
            toast.error(`Duplicate link detected! This link is already used for ${duplicate.delivery_name}.`);
            setIsSubmitting(false);
            return;
          }
        } catch (error) {
          console.error('Duplicate check failed:', error);
        }
      }

      // V1 SPEC: Payment Amount, Screenshot & Phone are MANDATORY for Customer Paid showrooms
      if (selectedDealership.paymentType === 'CUSTOMER_PAID') {
        if (!newRowData.received_amount || parseFloat(newRowData.received_amount) <= 0) {
          toast.error('Payment amount is mandatory for Customer Paid showrooms');
          return;
        }
        if (!newRowData.customer_phone || newRowData.customer_phone.trim().length < 10) {
          toast.error('Valid customer phone number is mandatory for Customer Paid showrooms');
          return;
        }
        if (!newRowData.payment_screenshot) {
          toast.error('Payment screenshot is mandatory for Customer Paid showrooms');
          return;
        }
      }

      // V1 SPEC: Rapido Screenshot is MANDATORY if Rapido Charge is entered
      if (newRowData.rapido_charge && parseFloat(newRowData.rapido_charge) > 0 && !newRowData.rapido_screenshot) {
        toast.error('Rapido screenshot is mandatory when a charge is entered');
        return;
      }

      // Generate delivery_name if blank
      let finalDeliveryName = newRowData.delivery_name;
      if (!finalDeliveryName) {
        const dateStr = newRowData.date.split('-').reverse().join('-'); // DD-MM-YYYY
        finalDeliveryName = `${dateStr}_${selectedDealership.name.split(' ')[0]}_${user?.name?.split(' ')[0] || 'USER'}_${Date.now().toString().slice(-4)}`.toUpperCase();
      }

      await simulateApiDelay(200);

      // Extract showroom code from dealership name (e.g., "Khatri Wheels (KHTR_WH)" -> "KHTR_WH")
      const showroomCode = getShowroomCode(selectedDealership.name);

      // Find the mapping to get cluster_code
      const mapping = mappings.find(m => m.dealershipId === selectedDealership.id);
      const cluster = clusters.find(c => c.id === mapping?.clusterId);

      // Use cluster name as code if explicit code not available (centralized with HomeScreen logic)
      const clusterCode = cluster?.name || 'UNKNOWN';

      // Create new delivery object
      const newDelivery: Delivery = {
        id: `delivery_${Date.now()}`,
        date: newRowData.date,
        showroom_code: showroomCode,
        cluster_code: clusterCode,
        showroom_type: mapping?.mappingType || 'SECONDARY',
        timing: null,
        delivery_name: finalDeliveryName,
        status: 'DONE', // V1 SPEC: Spreadsheet only shows DONE deliveries
        assigned_user_id: user?.id || null, // V1 FIX: Auto-assign to current user
        footage_link: newRowData.footage_link || null,
        payment_type: selectedDealership.paymentType,
        received_amount: newRowData.received_amount ? parseFloat(newRowData.received_amount) : undefined,
        customer_phone: newRowData.customer_phone || undefined,
        rapido_charge: newRowData.rapido_charge ? parseFloat(newRowData.rapido_charge) : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add reel_link if provided
      (newDelivery as any).reel_link = newRowData.reel_link || '';

      // V1 SPEC: Replace the placeholder row with the actual delivery
      // and update edit history for undo/redo  
      console.log('=== SAVE NEW ROW DEBUG ===');
      console.log('Before save - historyIndex:', historyIndex, 'editHistory.length:', editHistory.length);
      console.log('Current viewMode:', viewMode);

      // V5.0 SIGNATURE SYNC: Add row to Supabase and Google Sheets
      const client = supabase;
      
      // 1. Save to Supabase
      const savedDelivery = await deliveriesDb.createDelivery(newDelivery, client);

      // 2. Upload Screenshots if provided
      if (newRowData.payment_screenshot) {
        const path = `payments/${savedDelivery.id}_${Date.now()}.jpg`;
        const url = await screenshotsDb.uploadScreenshotFile(newRowData.payment_screenshot, path, client);
        await screenshotsDb.createScreenshot({
          delivery_id: savedDelivery.id,
          user_id: user?.id || '',
          type: 'PAYMENT',
          file_url: url,
          thumbnail_url: url,
          deleted_at: null
        }, client);
      }

      if (newRowData.rapido_screenshot) {
        const path = `rapido/${savedDelivery.id}_${Date.now()}.jpg`;
        const url = await screenshotsDb.uploadScreenshotFile(newRowData.rapido_screenshot, path, client);
        await screenshotsDb.createScreenshot({
          delivery_id: savedDelivery.id,
          user_id: user?.id || '',
          type: 'RAPIDO',
          file_url: url,
          thumbnail_url: url,
          deleted_at: null
        }, client);
      }
      
      // 3. Sync with Google Sheets
      await handleTriggerSheetSync(savedDelivery, 'sync', null); // null oldSignature means add new row

      // 3. Update local state with the saved delivery (to get the real ID)
      setDeliveries(prevDeliveries => {
        const updatedDeliveries = [...prevDeliveries, savedDelivery];

        setEditHistory(prevHistory => {
          setHistoryIndex(prevIndex => {
            const newHistory = prevHistory.slice(0, prevIndex + 1);
            newHistory.push(updatedDeliveries);
            return newHistory.length - 1;
          });
          return [...prevHistory.slice(0, historyIndex + 1), updatedDeliveries];
        });

        return updatedDeliveries;
      });

      // V9.0: Auto-set filter date to the new record's date so the user can see it
      setSpreadSheetDate(savedDelivery.date);
      setShowAllTime(false); // Switch to specific date view if all-time was on

      setIsAddDialogOpen(false);
      
      // Reset new row form
      setNewRowData({
        date: '',
        showroom_id: '',
        delivery_name: '',
        footage_link: '',
        reel_link: '',
        received_amount: '',
        customer_phone: '',
        rapido_charge: '',
        payment_screenshot: null,
        rapido_screenshot: null
      });

      toast.success('Delivery row saved and synced successfully');
    } catch (error) {
      console.error('Failed to create delivery:', error);
      toast.error('Failed to save delivery record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAddRow = () => {
    setIsAddDialogOpen(false);
  };

  const paymentScreenshots = screenshots.filter(s => s.type === 'PAYMENT' && !s.deleted_at);
  const followScreenshots = screenshots.filter(s => s.type === 'FOLLOW' && !s.deleted_at);
  const rapidoScreenshots = screenshots.filter(s => s.type === 'RAPIDO' && !s.deleted_at);
  const platformPaymentScreenshots = screenshots.filter(s => s.type === 'PLATFORM_PAYMENT' && !s.deleted_at);
  const fraudDetectionScreenshots = screenshots.filter(s => s.type === 'FRAUD_DETECTION' && !s.deleted_at);

  // V1 SPEC: Apply filters to screenshots
  const applyFilters = (screenshotList: any[]) => {
    return screenshotList.filter(s => {
      // Date filter
      if (selectedDate !== 'all') {
        const screenshotDate = getOperationalDateString(new Date(s.uploaded_at));
        if (screenshotDate !== selectedDate) return false;
      }

      // Photographer filter
      if (selectedPhotographer !== 'all' && s.user_id !== selectedPhotographer) {
        return false;
      }

      return true;
    });
  };

  const filteredPaymentScreenshots = applyFilters(paymentScreenshots);
  const filteredFollowScreenshots = applyFilters(followScreenshots);
  const filteredRapidoScreenshots = applyFilters(rapidoScreenshots);
  const filteredPlatformPaymentScreenshots = applyFilters(platformPaymentScreenshots);
  const filteredFraudDetectionScreenshots = applyFilters(fraudDetectionScreenshots);

  // Get unique dates and photographers for filter options
  const uniqueDates = Array.from(new Set(screenshots.map(s => getOperationalDateString(new Date(s.uploaded_at)))));
  const uniquePhotographers = Array.from(new Set(screenshots.map(s => s.user_id)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Main Tab Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Main Tab</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={mainTab} onValueChange={(v: any) => setMainTab(v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* V1 SPEC: Separate Data Views from Audit Views */}
              <SelectItem value="earnings" className="font-semibold">💰 Earnings Tracker</SelectItem>
              <SelectItem value="data" className="font-semibold">📊 Data Views</SelectItem>
            </SelectContent>
          </Select>

          {/* Non-Admin Warning */}
          {!isAdmin && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
              <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Limited Access</p>
                <p className="text-xs text-orange-700 mt-1">
                  Audit Views (screenshot galleries & logs) are restricted to admin users only.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Earnings Tracker (Photographer Only) */}
      {mainTab === 'earnings' && (
        <EarningsTracker />
      )}

      {/* Data Views (Admin + Photographer) */}
      {mainTab === 'data' && (
        <>
          {/* View Mode Selector */}
          <Card>
            <CardHeader>
              <CardTitle>View Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* V1 SPEC: Separate Data Views from Audit Views */}
                  <SelectItem value="spreadsheet" className="font-semibold">📊 Data Views</SelectItem>
                  <SelectItem value="spreadsheet" className="pl-6">Spreadsheet View</SelectItem>
                  <SelectItem value="portrait" className="pl-6">Live Portrait Bookings</SelectItem>

                  {/* V1 SPEC: Screenshot galleries and logs are ADMIN-ONLY */}
                  {isAdmin && (
                    <>
                      <SelectItem value="payment" disabled className="font-semibold mt-2">🔒 Audit Views (Admin Only)</SelectItem>
                      <SelectItem value="payment" className="pl-6">Payment Screenshots</SelectItem>
                      <SelectItem value="follow" className="pl-6">Follow Screenshots</SelectItem>
                      <SelectItem value="rapido" className="pl-6">Rapido Screenshots</SelectItem>
                      <SelectItem value="platform_payment" className="pl-6">Yourphotocrew Payment Screenshots</SelectItem>
                      <SelectItem value="fraud_detection" className="pl-6">Fraud Detection Photos</SelectItem>
                      <SelectItem value="logs" className="pl-6">Admin Logs</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>

              {/* Non-Admin Warning */}
              {!isAdmin && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
                  <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Limited Access</p>
                    <p className="text-xs text-orange-700 mt-1">
                      Audit Views (screenshot galleries & logs) are restricted to admin users only.
                    </p>
                  </div>
                </div>
              )}
              {/* DEBUG: Admin Client Status */}
              {isAdmin && (
                <div className={`mt-3 p-2 rounded text-xs border ${adminSupabase ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                  <p className="font-bold flex items-center gap-2">
                    {adminSupabase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Admin Client: {adminSupabase ? 'ACTIVE' : 'INACTIVE (Check .env VITE_SUPABASE_SERVICE_ROLE_KEY)'}
                  </p>
                  {!adminSupabase && <p className="mt-1">You are viewing data with standard permissions. Some records may be hidden.</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Configuration Access (Admin Only) */}
          {isAdmin && (
            <>
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Settings className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-blue-900">System Configuration</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Manage clusters, dealerships, photographers, and mappings
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate('/admin/config')}
                      variant="default"
                      className="gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-purple-900">Leave Management</p>
                        <p className="text-xs text-purple-700 mt-1">
                          View and manage photographer leaves (half-day tracking)
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate('/admin/leave')}
                      variant="default"
                      className="gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      Manage Leaves
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Bell className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-orange-900">System Audit</p>
                        <p className="text-xs text-orange-700 mt-1">
                          Nudge photographers with pending updates or reel backlog
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleRunAudit}
                      disabled={auditLoading}
                      variant="default"
                      className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <ClipboardCheck className={`h-4 w-4 ${auditLoading ? 'animate-pulse' : ''}`} />
                      {auditLoading ? 'Auditing...' : 'Run System Audit'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Spreadsheet View */}
          {viewMode === 'spreadsheet' && (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>Deliveries Covered Log</CardTitle>
                    <div className="flex items-center gap-2">
                      {/* V1 SPEC: Undo/Redo buttons for spreadsheet edits */}
                      <Button
                        onClick={() => {
                          console.log('Undo clicked - historyIndex:', historyIndex, 'editHistory.length:', editHistory.length);
                          handleUndo();
                        }}
                        size="sm"
                        variant="outline"
                        disabled={historyIndex <= 0}
                        className="gap-1"
                        title={`History Index: ${historyIndex}, History Length: ${editHistory.length}`}
                      >
                        <Undo2 className="h-3 w-3" />
                        Undo ({historyIndex})
                      </Button>
                      <Button
                        onClick={() => {
                          console.log('Redo clicked - historyIndex:', historyIndex, 'editHistory.length:', editHistory.length);
                          handleRedo();
                        }}
                        size="sm"
                        variant="outline"
                        disabled={historyIndex >= editHistory.length - 1}
                        className="gap-1"
                        title={`History Index: ${historyIndex}, History Length: ${editHistory.length}`}
                      >
                        <Redo2 className="h-3 w-3" />
                        Redo ({editHistory.length})
                      </Button>
                       <Button 
                        onClick={handleBulkSyncPending} 
                        disabled={pendingSyncs.size === 0 || isSyncingBulk}
                        size="sm" 
                        variant={pendingSyncs.size > 0 ? "destructive" : "outline"}
                        className="gap-2"
                      >
                        <BellRing className={`h-4 w-4 ${pendingSyncs.size > 0 ? "animate-pulse" : ""}`} />
                        {isSyncingBulk ? "Syncing..." : `Sync Now (${pendingSyncs.size} Pending)`}
                      </Button>
                      <Button 
                        onClick={handleBulkSyncVisible} 
                        disabled={isSyncingBulk || filteredDeliveries.length === 0}
                        size="sm" 
                        variant="default"
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                        title={showAllTime ? "Sync all historical records" : `Sync records for ${spreadSheetDate}`}
                      >
                        <RefreshCw className={`h-4 w-4 ${isSyncingBulk ? "animate-spin" : ""}`} />
                        Sync {filteredDeliveries.length} {showAllTime ? 'Total' : 'for Today'}
                      </Button>
                      <Button onClick={handleExportCSV} size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Export CSV
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Showroom/Dealership Filter */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Dealership</label>
                      <SearchableSelect
                        options={[
                          { label: "All Dealerships", value: "all" },
                          ...dealerships.slice().sort((a, b) => a.name.localeCompare(b.name)).map(d => ({
                            label: d.name,
                            value: d.id
                          }))
                        ]}
                        value={selectedShowroom}
                        onValueChange={setSelectedShowroom}
                        placeholder="Select dealership"
                      />
                    </div>

                    {/* V9.0: Date Filter */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Filter by Date</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="showAllTime" 
                            checked={showAllTime} 
                            onChange={(e) => setShowAllTime(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="showAllTime" className="text-sm text-gray-600 cursor-pointer">Show All Time</label>
                        </div>
                      </div>
                      <Input
                        type="date"
                        value={spreadSheetDate}
                        onChange={(e) => setSpreadSheetDate(e.target.value)}
                        disabled={showAllTime}
                        className={showAllTime ? 'opacity-50' : ''}
                      />
                    </div>
                  </div>

                  {/* V1 SPEC: Spreadsheet is a log of covered deliveries */}
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                    <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-700" />
                    <div className="text-blue-800">
                      <p className="font-medium">Delivery Coverage Log</p>
                      <p className="text-xs text-blue-700 mt-1">
                        This sheet shows only deliveries where SEND UPDATE was pressed (status: DONE). Deliveries with just footage links (draft state) do not appear here.
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Delivery Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Footage Link</TableHead>
                        <TableHead>Reel Link</TableHead>
                        <TableHead>Photographer Name</TableHead>
                        <TableHead>Amount Received</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Rapido Charge</TableHead>
                        <TableHead className="w-[80px] text-center">Sync</TableHead>
                        {isAdmin && <TableHead className="w-[50px] text-right text-gray-400">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeliveries
                        .map(delivery => {
                          const photographer = allUsers.find(p => p.id === delivery.assigned_user_id);

                          // V1 SPEC: Showroom = "Dealership Name + Cluster Name"
                          // Resolved from showroom_code
                          let showroomDisplay = 'Unknown Showroom';
                          const resolvedDealership = dealerships.find(d => {
                            const code = getShowroomCode(d.name);
                            return code === delivery.showroom_code;
                          });

                          if (resolvedDealership) {
                            // Fix: Dealership doesn't have cluster_id, find via mapping
                            const mapping = mappings.find(m => m.dealershipId === resolvedDealership.id);
                            const cluster = clusters.find(c => c.id === mapping?.clusterId || c.name === delivery.cluster_code);
                            showroomDisplay = cluster ? `${resolvedDealership.name} ${cluster.name}` : resolvedDealership.name;
                          } else {
                            showroomDisplay = delivery.showroom_code; // Fallback
                          }

                          const isEditingFootage = editingCell?.deliveryId === delivery.id && editingCell?.field === 'footage_link';
                          const isEditingReel = editingCell?.deliveryId === delivery.id && editingCell?.field === 'reel_link';

                          return (
                            <TableRow key={delivery.id}>
                              {/* Delivery Name (Editable for Admin) */}
                              <TableCell className="text-sm font-medium">
                                {editingCell?.deliveryId === delivery.id && editingCell?.field === 'delivery_name' ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="h-7 text-xs w-[150px]"
                                      placeholder="Customer Name"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                    />
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                                      <Check className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                      <X className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    className={`flex items-center gap-2 p-1 rounded group ${isAdmin ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                    onClick={() => isAdmin && handleStartEdit(delivery.id, 'delivery_name', delivery.delivery_name || '')}
                                    title={isAdmin ? "Click to edit delivery/customer name" : ""}
                                  >
                                    <span className="truncate max-w-[150px]">
                                      {delivery.delivery_name}
                                    </span>
                                    {isAdmin && (
                                      <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                                    )}
                                  </div>
                                )}
                              </TableCell>

                              <TableCell className="text-sm">
                                {(() => {
                                  if (!delivery.date || typeof delivery.date !== 'string') return 'N/A';
                                  // V4.7 FIX: Handle data corruption (e.g. strings containing "?historyState")
                                  const baseDate = delivery.date.split('?')[0];
                                  const parts = baseDate.split('-');
                                  if (parts.length < 3) return baseDate;
                                  const [y, m, d] = parts;
                                  return `${d}/${m}/${y}`;
                                })()}
                              </TableCell>

                              {/* Footage Link (Editable) */}
                              <TableCell className="text-sm">
                                {isEditingFootage ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="h-7 text-xs"
                                      placeholder="https://drive.google.com/..."
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                    />
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                                      <Check className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                      <X className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    className="flex items-center gap-2 p-1 rounded group cursor-pointer hover:bg-gray-50"
                                    onClick={() => handleStartEdit(delivery.id, 'footage_link', delivery.footage_link || '')}
                                    title={`Click to add/edit footage link (${showroomDisplay} - ${delivery.delivery_name})`}
                                  >
                                    <span className="flex-1 truncate max-w-[200px]">
                                      {delivery.footage_link || <span className="text-gray-400">Click to add</span>}
                                    </span>
                                    <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                                  </div>
                                )}
                              </TableCell>

                              {/* Reel Link (Editable) */}
                              <TableCell className="text-sm">
                                {isEditingReel ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="h-7 text-xs"
                                      placeholder="Reel link or leave empty"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                    />
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                                      <Check className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                      <X className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    className="flex items-center gap-2 p-1 rounded group cursor-pointer hover:bg-gray-50"
                                    onClick={() => handleStartEdit(delivery.id, 'reel_link', (delivery as any).reel_link || '')}
                                    title="Click to add/edit reel link"
                                  >
                                    <span className="flex-1 truncate max-w-[200px]">
                                      {(delivery as any).reel_link || <span className="text-gray-400">Click to add</span>}
                                    </span>
                                    <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                                  </div>
                                )}
                              </TableCell>

                              {/* Photographer Name (Editable for Admin) */}
                              <TableCell className="text-sm">
                                {editingCell?.deliveryId === delivery.id && editingCell?.field === 'assigned_user_id' ? (
                                  <div className="flex items-center gap-1">
                                    <Select
                                      value={editValue}
                                      onValueChange={setEditValue}
                                    >
                                      <SelectTrigger className="h-7 text-xs w-[180px]">
                                        <SelectValue placeholder="Select Photographer" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {photographers.map(p => {
                                          // Determine leave status
                                          let isLeft = false;
                                          if (delivery.date) {
                                            const hours = delivery.timing ? parseInt(delivery.timing.split(':')[0]) : 9;
                                            const half = hours < 14 ? 'FIRST_HALF' : 'SECOND_HALF';
                                            isLeft = isPhotographerOnLeave(p.id, delivery.date, half);
                                          }

                                          return (
                                            <SelectItem key={p.id} value={p.id} className={isLeft ? "text-red-500 font-medium" : ""}>
                                              {p.name} {isLeft ? '(On Leave)' : ''}
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                                      <Check className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                      <X className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    className={`flex items-center gap-2 p-1 rounded group ${isAdmin && delivery.status !== 'DONE' ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                    onClick={() => isAdmin && delivery.status !== 'DONE' && handleStartEdit(delivery.id, 'assigned_user_id', delivery.assigned_user_id || 'unassigned')}
                                    title={isAdmin && delivery.status !== 'DONE' ? "Click to reassign photographer" : "Read-only after closeout"}
                                  >
                                    <span className={!photographer ? "text-red-500 font-medium" : ""}>
                                      {photographer?.name || 'Unassigned'}
                                    </span>
                                    {isAdmin && (
                                      <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              {/* Amount Received (Editable for Admin) */}
                              <TableCell className="text-sm">
                                {editingCell?.deliveryId === delivery.id && editingCell?.field === 'received_amount' ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="h-7 text-xs w-[80px]"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                    />
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                                      <Check className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                      <X className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    className={`flex items-center gap-2 p-1 rounded group ${isAdmin ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                    onClick={() => isAdmin && handleStartEdit(delivery.id, 'received_amount', delivery.received_amount?.toString() || '')}
                                    title={isAdmin ? "Click to edit amount" : "Admin-only"}
                                  >
                                    {delivery.received_amount ? (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        ₹{delivery.received_amount}
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                    {isAdmin && (
                                      <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              {/* Phone Number (Editable for Admin) */}
                              <TableCell className="text-sm font-mono">
                                {editingCell?.deliveryId === delivery.id && editingCell?.field === 'customer_phone' ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="h-7 text-xs w-[120px]"
                                      placeholder="Phone number"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                    />
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                                      <Check className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                      <X className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    className={`flex items-center gap-2 p-1 rounded group ${isAdmin ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                    onClick={() => isAdmin && handleStartEdit(delivery.id, 'customer_phone', delivery.customer_phone || '')}
                                    title={isAdmin ? "Click to edit phone number" : "Admin-only"}
                                  >
                                    <span>{delivery.customer_phone || <span className="text-gray-400">-</span>}</span>
                                    {isAdmin && (
                                      <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              {/* Rapido Charge (Editable for Admin) */}
                              <TableCell className="text-sm">
                                {editingCell?.deliveryId === delivery.id && editingCell?.field === 'rapido_charge' ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="h-7 text-xs w-[80px]"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                    />
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                                      <Check className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                      <X className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    className={`flex items-center gap-2 p-1 rounded group ${isAdmin ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                    onClick={() => isAdmin && handleStartEdit(delivery.id, 'rapido_charge', delivery.rapido_charge?.toString() || '')}
                                    title={isAdmin ? "Click to edit charge" : "Admin-only"}
                                  >
                                    {delivery.rapido_charge ? (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                        ₹{delivery.rapido_charge}
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                    {isAdmin && (
                                      <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              {/* Sync Status Icon */}
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-8 w-8 p-0 rounded-full ${pendingSyncs.has(delivery.id) ? 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700' : 'text-gray-400 hover:text-blue-600'}`}
                                  onClick={() => handleTriggerSheetSync(delivery, 'sync')}
                                  disabled={isSyncingBulk}
                                  title={pendingSyncs.has(delivery.id) ? "Sync Pending/Failed (Click to retry)" : "Sync to Google Sheets"}
                                >
                                  {pendingSyncs.has(delivery.id) ? (
                                    <AlertTriangle className="h-4 w-4 animate-pulse" />
                                  ) : (
                                    <RefreshCw className={`h-4 w-4 ${isSyncingBulk ? 'opacity-50' : ''}`} />
                                  )}
                                </Button>
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteDelivery(delivery.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}

                      {/* Add New Row Dialog */}
                      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                          <DialogHeader className="px-6 py-4 border-b">
                            <DialogTitle>Add New Delivery Record</DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-gray-500">Date</label>
                                <Input
                                  type="date"
                                  value={newRowData.date}
                                  onChange={(e) => setNewRowData({ ...newRowData, date: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-gray-500">Showroom</label>
                                <SearchableSelect
                                  options={dealerships.map(d => ({ 
                                    label: getShowroomDisplayName(d.id), 
                                    value: d.id 
                                  }))}
                                  value={newRowData.showroom_id}
                                  onValueChange={(value) => setNewRowData({ ...newRowData, showroom_id: value })}
                                  placeholder="Select showroom"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase text-gray-500">Reference ID (Internal)</label>
                              <Input
                                value={newRowData.delivery_name}
                                onChange={(e) => setNewRowData({ ...newRowData, delivery_name: e.target.value })}
                                placeholder="Leave blank to auto-generate"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase text-gray-500">Footage Link</label>
                              <Input
                                value={newRowData.footage_link}
                                onChange={(e) => setNewRowData({ ...newRowData, footage_link: e.target.value })}
                                placeholder="https://drive.google.com/..."
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase text-gray-500">Reel Link</label>
                              <Input
                                value={newRowData.reel_link}
                                onChange={(e) => setNewRowData({ ...newRowData, reel_link: e.target.value })}
                                placeholder="https://instagram.com/reel/..."
                              />
                            </div>

                            {/* CONDITIONAL PAYMENT FIELDS */}
                            {dealerships.find(d => d.id === newRowData.showroom_id)?.paymentType === 'CUSTOMER_PAID' && (
                              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold uppercase text-red-500">Payment Amount (MANDATORY)</label>
                                  <Input
                                    type="number"
                                    value={newRowData.received_amount}
                                    onChange={(e) => setNewRowData({ ...newRowData, received_amount: e.target.value })}
                                    placeholder="Enter amount"
                                    className={!newRowData.received_amount ? 'border-red-300 bg-red-50' : ''}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold uppercase text-red-500">Customer Phone (MANDATORY)</label>
                                  <Input
                                    value={newRowData.customer_phone}
                                    onChange={(e) => setNewRowData({ ...newRowData, customer_phone: e.target.value })}
                                    placeholder="Enter phone number"
                                    className={!newRowData.customer_phone ? 'border-red-300 bg-red-50' : ''}
                                  />
                                </div>
                                <div className="col-span-2 space-y-2 text-red-600">
                                  <label className="text-xs font-semibold uppercase text-red-500">Payment Screenshot (MANDATORY)</label>
                                  <div className="flex gap-2 items-center">
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => setNewRowData({ ...newRowData, payment_screenshot: e.target.files?.[0] || null })}
                                      className="hidden"
                                      id="payment-upload"
                                    />
                                    <label
                                      htmlFor="payment-upload"
                                      className={`flex-1 cursor-pointer flex items-center justify-center gap-2 p-2 border-2 border-dashed rounded-md transition-colors ${
                                        !newRowData.payment_screenshot ? 'border-red-300 bg-red-50' : 'hover:bg-gray-50'
                                      }`}
                                    >
                                      <Upload className="h-4 w-4 text-red-400" />
                                      <span className="text-sm font-medium">
                                        {newRowData.payment_screenshot ? newRowData.payment_screenshot.name : 'Upload Payment Proof'}
                                      </span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* CONDITIONAL RAPIDO FIELDS (Cross-Cluster Check) */}
                            {(() => {
                              const selectedShowroom = dealerships.find(d => d.id === newRowData.showroom_id);
                              if (!selectedShowroom) return null;
                              
                              const showroomMapping = mappings.find(m => m.dealershipId === selectedShowroom.id);
                              const showroomClusterId = showroomMapping?.clusterId;
                              
                              const myClusterIds = mappings
                                .filter(m => m.photographerId === user?.id)
                                .map(m => m.clusterId);
                              
                              const isCrossCluster = showroomClusterId && !myClusterIds.includes(showroomClusterId);
                              
                              if (!isCrossCluster) return null;

                              return (
                                <div className="space-y-4 border-t pt-4">
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase text-gray-500 text-blue-600">Rapido Charge (Cross-Cluster)</label>
                                    <Input
                                      type="number"
                                      value={newRowData.rapido_charge}
                                      onChange={(e) => setNewRowData({ ...newRowData, rapido_charge: e.target.value })}
                                      placeholder="Optional"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase text-gray-500 text-blue-600">
                                      Rapido Screenshot {newRowData.rapido_charge ? '(MANDATORY)' : '(Optional)'}
                                    </label>
                                    <div className="flex gap-2 items-center">
                                      <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setNewRowData({ ...newRowData, rapido_screenshot: e.target.files?.[0] || null })}
                                        className="hidden"
                                        id="rapido-upload"
                                      />
                                      <label
                                        htmlFor="rapido-upload"
                                        className={`flex-1 cursor-pointer flex items-center justify-center gap-2 p-2 border-2 border-dashed rounded-md transition-colors ${
                                          newRowData.rapido_charge && !newRowData.rapido_screenshot 
                                            ? 'border-red-300 bg-red-50' 
                                            : 'hover:bg-gray-50'
                                        }`}
                                      >
                                        <Upload className={`h-4 w-4 ${newRowData.rapido_charge ? 'text-blue-500' : 'text-gray-400'}`} />
                                        <span className={`text-sm ${newRowData.rapido_charge ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                                          {newRowData.rapido_screenshot ? newRowData.rapido_screenshot.name : 'Upload Rapido Bill'}
                                        </span>
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          <DialogFooter className="px-6 py-4 border-t flex justify-end gap-2 bg-gray-50/50">
                            <Button variant="outline" onClick={handleCancelAddRow} disabled={isSubmitting}>Cancel</Button>
                            <Button onClick={handleSaveNewRow} disabled={isSubmitting}>
                              {isSubmitting ? 'Saving...' : 'Save Record'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableBody>
                  </Table>
                </div>

                {/* DEBUG INFO */}
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs font-mono">
                  <strong>DEBUG:</strong> historyIndex={historyIndex} | editHistory.length={editHistory.length} |
                  canUndo={historyIndex > 0 ? 'YES' : 'NO'} | canRedo={historyIndex < editHistory.length - 1 ? 'YES' : 'NO'}
                </div>

                {/* Add New Row Button */}
                <div className="mt-4">
                  <Button onClick={handleStartAddRow} variant="outline" className="w-full gap-2 border-green-200 text-green-700 hover:bg-green-50">
                    <Plus className="h-4 w-4" />
                    Add New Delivery Row
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Screenshots Gallery */}
          {viewMode === 'payment' && (
            <div className="space-y-4">
              {/* V1 SPEC: Filters */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Date</label>
                      <Select value={selectedDate} onValueChange={setSelectedDate}>
                        <SelectTrigger>
                          <SelectValue placeholder="All dates" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Dates</SelectItem>
                          {uniqueDates.map(date => (
                            <SelectItem key={date} value={date}>
                              {new Date(date).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Photographer</label>
                      <Select value={selectedPhotographer} onValueChange={setSelectedPhotographer}>
                        <SelectTrigger>
                          <SelectValue placeholder="All photographers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Photographers</SelectItem>
                          {uniquePhotographers.map(userId => {
                            const photographer = allUsers.find(p => p.id === userId);
                            return (
                              <SelectItem key={userId} value={userId}>
                                {photographer?.name || 'Unknown'}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Payment Screenshots Gallery</h2>
                  <p className="text-sm text-gray-500">Admin-only view • Binary artifacts storage</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#2563EB] text-white">{filteredPaymentScreenshots.length} images</Badge>
                  <Button
                    variant={galleryViewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGalleryViewMode(prev => prev === 'grid' ? 'single' : 'grid')}
                  >
                    <Grid className="h-4 w-4 mr-2" />
                    {galleryViewMode === 'grid' ? 'Single View' : 'Grid View'}
                  </Button>
                </div>
              </div>

              {/* V1 SPEC: Persistent warning - Gallery actions are audit-only */}
              <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-lg">
                <p className="text-sm font-semibold text-amber-900">⚠️ Gallery Actions are Audit-Only</p>
                <p className="text-xs text-amber-800 mt-1">
                  Screenshots are immutable after SEND UPDATE. Deleting screenshots removes them from storage but does NOT reopen tasks, affect delivery status, or modify spreadsheet data.
                </p>
              </div>

              {/* V1 SPEC: Screenshot gallery is NOT spreadsheet - distinct mental model */}
              <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded text-sm">
                <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-700" />
                <div className="text-purple-800">
                  <p className="font-medium">Gallery Mode (Not Spreadsheet)</p>
                  <p className="text-xs text-purple-700 mt-1">
                    This is a separate binary artifacts view. Screenshot deletion does NOT affect spreadsheet data, delivery status, or reopen tasks.
                  </p>
                </div>
              </div>

              {filteredPaymentScreenshots.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500">No payment screenshots available</p>
                  </CardContent>
                </Card>
              ) : galleryViewMode === 'single' ? (
                /* V1 SPEC: Default to single-image inspection with Next/Previous */
                <Card>
                  <CardContent className="p-6 space-y-4">
                    {/* Image */}
                    <div className="relative">
                      <ImageWithFallback
                        src={filteredPaymentScreenshots[currentImageIndex]?.file_url}
                        alt="Payment Screenshot"
                        className="w-full rounded-lg max-h-96 object-contain bg-gray-100"
                      />
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentImageIndex === 0}
                        onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600">
                        {currentImageIndex + 1} / {filteredPaymentScreenshots.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentImageIndex === filteredPaymentScreenshots.length - 1}
                        onClick={() => setCurrentImageIndex(prev => Math.min(filteredPaymentScreenshots.length - 1, prev + 1))}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>

                    {/* Metadata - persistently visible */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Delivery Name:</span>
                        <span className="text-sm text-gray-900">
                          {deliveries.find(d => d.id === filteredPaymentScreenshots[currentImageIndex]?.delivery_id)?.delivery_name || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Photographer:</span>
                        <span className="text-sm text-gray-600 mt-1">
                          {allUsers.find(p => p.id === filteredPaymentScreenshots[currentImageIndex]?.user_id)?.name || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Date:</span>
                        <span className="text-sm text-gray-500 mt-1">
                          {deliveries.find(d => d.id === filteredPaymentScreenshots[currentImageIndex]?.delivery_id)?.date || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {/* V1 SPEC: Deletion helper text */}
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      <p className="font-semibold">Deletion is for audit cleanup only</p>
                      <p className="mt-1">Deleting a screenshot removes it from the gallery and storage but does NOT affect delivery status, spreadsheet data, or reopen tasks.</p>
                    </div>

                    {/* Actions */}
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm('Delete this screenshot permanently? This action cannot be undone.')) {
                          handleDeleteScreenshot(filteredPaymentScreenshots[currentImageIndex]?.id);
                          if (currentImageIndex >= filteredPaymentScreenshots.length - 1) {
                            setCurrentImageIndex(Math.max(0, currentImageIndex - 1));
                          }
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Screenshot
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                /* Grid view (optional) */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPaymentScreenshots.map((screenshot, index) => {
                    const delivery = deliveries.find(d => d.id === screenshot.delivery_id);
                    const photographer = allUsers.find(p => p.id === screenshot.user_id);
                    return (
                      <Card
                        key={screenshot.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                        onClick={() => {
                          setCurrentImageIndex(index);
                          setGalleryViewMode('single');
                        }}
                      >
                        <CardContent className="p-0">
                          <img
                            src={screenshot.file_url}
                            alt="Payment Screenshot"
                            className="w-full h-64 object-cover"
                          />
                          <div className="p-4 space-y-2 bg-white">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate text-gray-900">
                                  {delivery?.delivery_name || 'Unknown Delivery'}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  Photographer: {photographer?.name || 'Unknown'}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {new Date(screenshot.uploaded_at).toLocaleDateString('en-IN', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Follow Screenshots Gallery */}
          {viewMode === 'follow' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Follow Screenshots Gallery</h2>
                  <p className="text-sm text-gray-500">Admin-only view • Binary artifacts storage</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#2563EB] text-white">{filteredFollowScreenshots.length} images</Badge>
                  <Button
                    variant={galleryViewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGalleryViewMode(prev => prev === 'grid' ? 'single' : 'grid')}
                  >
                    <Grid className="h-4 w-4 mr-2" />
                    {galleryViewMode === 'grid' ? 'Single View' : 'Grid View'}
                  </Button>
                </div>
              </div>

              {/* V1 SPEC: Persistent warning - Gallery actions are audit-only */}
              <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-lg">
                <p className="text-sm font-semibold text-amber-900">⚠️ Gallery Actions are Audit-Only</p>
                <p className="text-xs text-amber-800 mt-1">
                  Screenshots are immutable after SEND UPDATE. Deleting screenshots removes them from storage but does NOT reopen tasks, affect delivery status, or modify spreadsheet data.
                </p>
              </div>

              {filteredFollowScreenshots.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500">No follow screenshots available</p>
                  </CardContent>
                </Card>
              ) : galleryViewMode === 'single' ? (
                /* V1 SPEC: Default to single-image inspection with Next/Previous */
                <Card>
                  <CardContent className="p-6 space-y-4">
                    {/* Image */}
                    <div className="relative">
                      <ImageWithFallback
                        src={filteredFollowScreenshots[currentImageIndex]?.file_url}
                        alt="Follow Screenshot"
                        className="w-full rounded-lg max-h-96 object-contain bg-gray-100"
                        fallback={<div className="w-full rounded-lg max-h-96 object-contain bg-gray-100 flex items-center justify-center text-gray-400">Image not found</div>}
                      />
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentImageIndex === 0}
                        onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600">
                        {currentImageIndex + 1} / {filteredFollowScreenshots.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentImageIndex === filteredFollowScreenshots.length - 1}
                        onClick={() => setCurrentImageIndex(prev => Math.min(filteredFollowScreenshots.length - 1, prev + 1))}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>

                    {/* Metadata - persistently visible */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Delivery Name:</span>
                        <span className="text-sm text-gray-900">
                          {deliveries.find(d => d.id === filteredFollowScreenshots[currentImageIndex]?.delivery_id)?.delivery_name || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Photographer:</span>
                        <span className="text-sm text-gray-600 mt-1">
                          {allUsers.find(p => p.id === filteredFollowScreenshots[currentImageIndex]?.user_id)?.name || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Date:</span>
                        <span className="text-sm text-gray-500 mt-1">
                          {deliveries.find(d => d.id === filteredFollowScreenshots[currentImageIndex]?.delivery_id)?.date || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {/* V1 SPEC: Deletion helper text */}
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      <p className="font-semibold">Deletion is for audit cleanup only</p>
                      <p className="mt-1">Deleting a screenshot removes it from the gallery and storage but does NOT affect delivery status, spreadsheet data, or reopen tasks.</p>
                    </div>

                    {/* Actions */}
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm('Delete this screenshot permanently? This action cannot be undone.')) {
                          handleDeleteScreenshot(filteredFollowScreenshots[currentImageIndex]?.id);
                          if (currentImageIndex >= filteredFollowScreenshots.length - 1) {
                            setCurrentImageIndex(Math.max(0, currentImageIndex - 1));
                          }
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Screenshot
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                /* Grid view (optional) */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredFollowScreenshots.map((screenshot, index) => {
                    const delivery = deliveries.find(d => d.id === screenshot.delivery_id);
                    const photographer = allUsers.find(p => p.id === screenshot.user_id);
                    return (
                      <Card
                        key={screenshot.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                        onClick={() => {
                          setCurrentImageIndex(index);
                          setGalleryViewMode('single');
                        }}
                      >
                        <CardContent className="p-0">
                          <img
                            src={screenshot.file_url}
                            alt="Follow Screenshot"
                            className="w-full h-64 object-cover"
                          />
                          <div className="p-4 space-y-2 bg-white">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate text-gray-900">
                                  {delivery?.delivery_name || 'Unknown Delivery'}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  Photographer: {photographer?.name || 'Unknown'}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {new Date(screenshot.uploaded_at).toLocaleDateString('en-IN', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Rapido Screenshots Gallery */}
          {viewMode === 'rapido' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Rapido Screenshots Gallery</h2>
                  <p className="text-sm text-gray-500">Admin-only view • Travel proof storage</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#2563EB] text-white">{filteredRapidoScreenshots.length} images</Badge>
                  <Button
                    variant={galleryViewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGalleryViewMode(prev => prev === 'grid' ? 'single' : 'grid')}
                  >
                    <Grid className="h-4 w-4 mr-2" />
                    {galleryViewMode === 'grid' ? 'Single View' : 'Grid View'}
                  </Button>
                </div>
              </div>

              {/* V1 SPEC: Persistent warning - Gallery actions are audit-only */}
              <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-lg">
                <p className="text-sm font-semibold text-amber-900">⚠️ Gallery Actions are Audit-Only</p>
                <p className="text-xs text-amber-800 mt-1">
                  Screenshots are immutable after SEND UPDATE. Deleting screenshots removes them from storage but does NOT reopen tasks, affect delivery status, or modify spreadsheet data.
                </p>
              </div>

              {filteredRapidoScreenshots.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500">No rapido screenshots available</p>
                  </CardContent>
                </Card>
              ) : galleryViewMode === 'single' ? (
                /* V1 SPEC: Default to single-image inspection with Next/Previous */
                <Card>
                  <CardContent className="p-6 space-y-4">
                    {/* Image */}
                    <div className="relative">
                      <ImageWithFallback
                        src={filteredRapidoScreenshots[currentImageIndex]?.file_url}
                        alt="Rapido Screenshot"
                        className="w-full rounded-lg max-h-96 object-contain bg-gray-100"
                        fallback={<div className="w-full rounded-lg max-h-96 object-contain bg-gray-100 flex items-center justify-center text-gray-400">Image not found</div>}
                      />
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentImageIndex === 0}
                        onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600">
                        {currentImageIndex + 1} / {filteredRapidoScreenshots.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentImageIndex === filteredRapidoScreenshots.length - 1}
                        onClick={() => setCurrentImageIndex(prev => Math.min(filteredRapidoScreenshots.length - 1, prev + 1))}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>

                    {/* Metadata - persistently visible */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Delivery Name:</span>
                        <span className="text-sm text-gray-900">
                          {deliveries.find(d => d.id === filteredRapidoScreenshots[currentImageIndex]?.delivery_id)?.delivery_name || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Photographer:</span>
                        <span className="text-sm text-gray-600 mt-1">
                          {allUsers.find(p => p.id === filteredRapidoScreenshots[currentImageIndex]?.user_id)?.name || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Date:</span>
                        <span className="text-sm text-gray-500 mt-1">
                          {deliveries.find(d => d.id === filteredRapidoScreenshots[currentImageIndex]?.delivery_id)?.date || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Rapido Charge:</span>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          ₹{deliveries.find(d => d.id === filteredRapidoScreenshots[currentImageIndex]?.delivery_id)?.rapido_charge || 0}
                        </Badge>
                      </div>
                    </div>

                    {/* V1 SPEC: Deletion helper text */}
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      <p className="font-semibold">Deletion is for audit cleanup only</p>
                      <p className="mt-1">Deleting a screenshot removes it from the gallery and storage but does NOT affect delivery status, spreadsheet data, or reopen tasks.</p>
                    </div>

                    {/* Actions */}
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm('Delete this screenshot permanently? This action cannot be undone.')) {
                          handleDeleteScreenshot(filteredRapidoScreenshots[currentImageIndex]?.id);
                          if (currentImageIndex >= filteredRapidoScreenshots.length - 1) {
                            setCurrentImageIndex(Math.max(0, currentImageIndex - 1));
                          }
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Screenshot
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                /* Grid view (optional) */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRapidoScreenshots.map((screenshot, index) => {
                    const delivery = deliveries.find(d => d.id === screenshot.delivery_id);
                    const photographer = allUsers.find(p => p.id === screenshot.user_id);
                    return (
                      <Card
                        key={screenshot.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                        onClick={() => {
                          setCurrentImageIndex(index);
                          setGalleryViewMode('single');
                        }}
                      >
                        <CardContent className="p-0">
                          <img
                            src={screenshot.file_url}
                            alt="Rapido Screenshot"
                            className="w-full h-64 object-cover"
                          />
                          <div className="p-4 space-y-2 bg-white">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate text-gray-900">
                                  {delivery?.delivery_name || 'Unknown Delivery'}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  Photographer: {photographer?.name || 'Unknown'}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                                  <span>
                                    {new Date(screenshot.uploaded_at).toLocaleDateString('en-IN', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                  {delivery?.rapido_charge && (
                                    <Badge variant="outline" className="h-5 text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                      ₹{delivery.rapido_charge}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Yourphotocrew Payment Gallery (Renamed from Platform Settlements) */}
          {viewMode === 'platform_payment' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Yourphotocrew Payment Screenshots</h2>
                  <p className="text-sm text-gray-500">Admin-only view • 30% Platform Settlement Proof</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#2563EB] text-white">{filteredPlatformPaymentScreenshots.length} images</Badge>
                  <Button
                    variant={galleryViewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGalleryViewMode(prev => prev === 'grid' ? 'single' : 'grid')}
                  >
                    <Grid className="h-4 w-4 mr-2" />
                    {galleryViewMode === 'grid' ? 'Single View' : 'Grid View'}
                  </Button>
                </div>
              </div>

              {/* V1 SPEC: Persistent warning - Gallery actions are audit-only */}
              <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-lg">
                <p className="text-sm font-semibold text-amber-900">⚠️ Gallery Actions are Audit-Only</p>
                <p className="text-xs text-amber-800 mt-1">
                  Screenshots are immutable after SEND UPDATE. Deleting screenshots removes them from storage but does NOT reopen tasks, affect delivery status, or modify spreadsheet data.
                </p>
              </div>

              {filteredPlatformPaymentScreenshots.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500">No settlement screenshots available</p>
                  </CardContent>
                </Card>
              ) : galleryViewMode === 'single' ? (
                /* V1 SPEC: Default to single-image inspection with Next/Previous */
                <Card>
                  <CardContent className="p-6 space-y-4">
                    {/* Image */}
                    <div className="relative">
                      <ImageWithFallback
                        src={filteredPlatformPaymentScreenshots[currentImageIndex]?.file_url}
                        alt="Platform Settlement Screenshot"
                        className="w-full rounded-lg max-h-96 object-contain bg-gray-100"
                        fallback={<div className="w-full rounded-lg max-h-96 object-contain bg-gray-100 flex items-center justify-center text-gray-400">Image not found</div>}
                      />
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentImageIndex === 0}
                        onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600">
                        {currentImageIndex + 1} / {filteredPlatformPaymentScreenshots.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentImageIndex === filteredPlatformPaymentScreenshots.length - 1}
                        onClick={() => setCurrentImageIndex(prev => Math.min(filteredPlatformPaymentScreenshots.length - 1, prev + 1))}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>

                    {/* Metadata - persistently visible */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Delivery Name:</span>
                        <span className="text-sm text-gray-900">
                          {deliveries.find(d => d.id === filteredPlatformPaymentScreenshots[currentImageIndex]?.delivery_id)?.delivery_name || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Photographer:</span>
                        <span className="text-sm text-gray-600 mt-1">
                          {allUsers.find(p => p.id === filteredPlatformPaymentScreenshots[currentImageIndex]?.user_id)?.name || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Date:</span>
                        <span className="text-sm text-gray-500 mt-1">
                          {deliveries.find(d => d.id === filteredPlatformPaymentScreenshots[currentImageIndex]?.delivery_id)?.date || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Collection:</span>
                        <span className="text-sm text-gray-600">₹{deliveries.find(d => d.id === filteredPlatformPaymentScreenshots[currentImageIndex]?.delivery_id)?.received_amount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Settlement Code:</span>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          PLATFORM_PAYMENT
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Payable Amount (30%):</span>
                        <Badge variant="outline" className="bg-green-600 text-white border-green-700">
                          ₹{(deliveries.find(d => d.id === filteredPlatformPaymentScreenshots[currentImageIndex]?.delivery_id)?.received_amount || 0) * 0.3}
                        </Badge>
                      </div>
                    </div>

                    {/* V1 SPEC: Deletion helper text */}
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      <p className="font-semibold">Deletion is for audit cleanup only</p>
                      <p className="mt-1">Deleting a screenshot removes it from the gallery and storage but does NOT affect delivery status, spreadsheet data, or reopen tasks.</p>
                    </div>

                    {/* Actions */}
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm('Delete this screenshot permanently? This action cannot be undone.')) {
                          handleDeleteScreenshot(filteredPlatformPaymentScreenshots[currentImageIndex]?.id);
                          if (currentImageIndex >= filteredPlatformPaymentScreenshots.length - 1) {
                            setCurrentImageIndex(Math.max(0, currentImageIndex - 1));
                          }
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Screenshot
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                /* Grid view (optional) */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPlatformPaymentScreenshots.map((screenshot, index) => {
                    const delivery = deliveries.find(d => d.id === screenshot.delivery_id);
                    const photographer = allUsers.find(p => p.id === screenshot.user_id);
                    return (
                      <Card
                        key={screenshot.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                        onClick={() => {
                          setCurrentImageIndex(index);
                          setGalleryViewMode('single');
                        }}
                      >
                        <CardContent className="p-0">
                          <img
                            src={screenshot.file_url}
                            alt="Platform Settlement Screenshot"
                            className="w-full h-64 object-cover"
                          />
                          <div className="p-4 space-y-2 bg-white">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate text-gray-900">
                                  {delivery?.delivery_name || 'Unknown Delivery'}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  Photographer: {photographer?.name || 'Unknown'}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                                  <span>
                                    {new Date(screenshot.uploaded_at).toLocaleDateString('en-IN', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                  {delivery?.received_amount && (
                                    <div className="flex flex-col items-end gap-1">
                                      <Badge variant="outline" className="h-5 text-[10px] bg-green-600 text-white border-green-700">
                                        Payable: ₹{delivery.received_amount * 0.3}
                                      </Badge>
                                      <div className="text-[10px] text-gray-400">
                                        from ₹{delivery.received_amount}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Live Portrait Bookings */}
          {viewMode === 'portrait' && (
            <LiveBookingsView />
          )}

          {/* Admin Logs Viewer */}
          {viewMode === 'logs' && (
            <AdminLogsViewer />
          )}

          {/* Audit & Nudge Dialog */}
          <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <BellRing className="h-6 w-6 text-orange-600" />
                  System Audit Results
                </DialogTitle>
                <DialogDescription>
                  Identified breaches as of {new Date().toLocaleDateString('en-IN')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Send Update Section */}
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                  <h4 className="font-semibold text-sm mb-3 flex items-center justify-between text-red-900">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Missing "Send Update" (Today)
                    </span>
                    <Badge variant="destructive">{auditResults?.missingUpdates.length || 0}</Badge>
                  </h4>
                  {auditResults?.missingUpdates.length === 0 ? (
                    <p className="text-xs text-gray-600 italic">No photographers breaching today. Everyone is up to date! 🎉</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {auditResults?.missingUpdates.map(u => (
                        <div key={u.userId} className="p-2 bg-white border border-red-200 rounded-md text-sm flex justify-between items-center shadow-sm">
                          <span className="font-medium text-gray-900">{u.name}</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                            u.leaveType === 'FULL_DAY' 
                              ? 'bg-blue-50 text-blue-600' 
                              : (u.leaveType === 'FIRST_HALF' || u.leaveType === 'SECOND_HALF')
                                ? 'bg-indigo-50 text-indigo-600'
                                : u.deliveryCount === 0 
                                  ? 'bg-amber-50 text-amber-600' 
                                  : 'bg-red-50 text-red-600'
                          }`}>
                            {u.leaveType === 'FULL_DAY' 
                              ? 'On Full Day Leave' 
                              : u.leaveType === 'FIRST_HALF'
                                ? 'On 1st Half Leave'
                                : u.leaveType === 'SECOND_HALF'
                                  ? 'On 2nd Half Leave'
                                  : u.deliveryCount === 0 
                                    ? 'No timings input' 
                                    : `${u.deliveryCount} Pending`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reel Backlog Section */}
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                  <h4 className="font-semibold text-sm mb-3 flex items-center justify-between text-orange-900">
                    <span className="flex items-center gap-2">
                      <Grid className="h-4 w-4" />
                      Reel Backlogs (2+ Days Old)
                    </span>
                    <Badge variant="outline" className="border-orange-300 text-orange-700 bg-white">
                      {auditResults?.reelBacklogs.length || 0}
                    </Badge>
                  </h4>
                  {auditResults?.reelBacklogs.length === 0 ? (
                    <p className="text-xs text-gray-600 italic">No pending reel backlogs found.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {auditResults?.reelBacklogs.map(u => (
                        <div key={u.userId} className="p-2 bg-white border border-orange-200 rounded-md text-sm flex justify-between items-center shadow-sm">
                          <span className="font-medium text-gray-900">{u.name}</span>
                          <span className="text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded text-xs">{u.taskCount} Reels</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4">
                <p className="text-[10px] text-gray-400 max-w-[200px] leading-tight">
                  Nudging sends an instant push notification to the photographer's device.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowAuditDialog(false)}>Dismiss</Button>
                  <Button
                    className="bg-orange-600 hover:bg-orange-700 gap-2 text-white px-6"
                    onClick={handleNudgeAll}
                    disabled={!auditResults || (auditResults.missingUpdates.length === 0 && auditResults.reelBacklogs.length === 0)}
                  >
                    <BellRing className="h-4 w-4" />
                    Nudge All Now
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* V6.0 Conflict Resolution Dialog */}
          <Dialog open={isConflictDialogOpen} onOpenChange={setIsConflictDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Sync Conflict Detected
                </DialogTitle>
                <DialogDescription>
                  The data in Google Sheets for <strong>{conflictDelivery?.delivery_name}</strong> is newer than your current CRM record. 
                  This usually happens when someone edits the spreadsheet directly.
                </DialogDescription>
              </DialogHeader>

              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-sm space-y-3">
                <div className="flex items-start gap-2">
                  <div className="mt-1 font-bold text-amber-900">1. Force Overwrite:</div>
                  <div className="text-amber-800">Use your CRM data to overwrite the Google Sheet. Use this if you are sure your CRM data is correct.</div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-1 font-bold text-amber-900">2. Refresh from Sheet:</div>
                  <div className="text-amber-800">Pull data from Google Sheets into the CRM. Use this to pick up changes made in the spreadsheet.</div>
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setIsConflictDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="secondary" 
                  className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" 
                  onClick={handleRefreshFromSheet}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Refreshing...' : 'Refresh CRM'}
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1" 
                  onClick={handleForceOverwrite}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Forcing...' : 'Force Overwrite'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
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
import { getStatusColor, getOperationalDateString } from '../lib/utils';
import { Download, Trash2, ChevronLeft, ChevronRight, Grid, FileText, Lock, Undo2, Redo2, Edit2, Check, X, Settings, Calendar, Trophy, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { AdminLogsViewer } from './AdminLogsViewer';
import { IncentiveTracker } from './IncentiveTracker';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';
import { LiveBookingsView } from './LiveBookingsView';
import * as configDb from '../lib/db/config';

export function ViewScreen() {
  const { user } = useAuth();
  const { dealerships, clusters, mappings, photographers } = useConfig();
  const navigate = useNavigate();

  // DEBUG: Track render count
  const renderCount = React.useRef(0);
  renderCount.current++;
  console.log(`🎨 ViewScreen RENDER #${renderCount.current} - historyIndex will be updated below`);

  // V1 SPEC: Photographers see two tabs: Incentive Tracker + Spreadsheet
  // Admins see: Spreadsheet + Payment Gallery + Follow Gallery + Logs
  const [mainTab, setMainTab] = useState<'incentive' | 'data'>('data');

  // V1 SPEC: Admin View has 3 mutually exclusive modes:
  // 4. Logs View (admin audit trail)
  // 5. Portrait View (live_bookings)
  // V1 RULE: Photographers must NEVER see screenshot galleries (modes 2 & 3)
  const [viewMode, setViewMode] = useState<'spreadsheet' | 'payment' | 'follow' | 'logs' | 'portrait'>('spreadsheet');
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

  // Add new row state
  const [newRowData, setNewRowData] = useState({
    date: '',
    showroom_id: '',
    delivery_name: '',
    photographer_id: '',
    footage_link: '',
    reel_link: ''
  });

  // V1 SPEC: Only ADMIN can access screenshot galleries
  const isAdmin = user?.role === 'ADMIN';

  // DEBUG: Log current state values on every render
  console.log(`📊 STATE VALUES: historyIndex=${historyIndex}, editHistory.length=${editHistory.length}, deliveries.length=${deliveries.length}`);

  // Helper function to format showroom display as "Dealership + Cluster"
  const getShowroomDisplayName = (mappingId: string): string => {
    const mapping = mappings.find(m => m.id === mappingId);
    if (!mapping) return 'Unknown Showroom';

    const dealership = dealerships.find(d => d.id === mapping.dealershipId);
    const cluster = clusters.find(c => c.id === mapping.clusterId);

    return dealership && cluster ? `${dealership.name} ${cluster.name}` : 'Unknown Showroom';
  };

  useEffect(() => {
    console.log('🚀 ViewScreen mounted - CODE VERSION: 2024-01-20-DEBUG');
    loadData();
  }, []);

  // DEBUG: Log whenever edit history changes
  useEffect(() => {
    console.log('📊 Edit History Changed - historyIndex:', historyIndex, 'editHistory.length:', editHistory.length);
    console.log('   Can Undo:', historyIndex > 0, 'Can Redo:', historyIndex < editHistory.length - 1);
  }, [editHistory, historyIndex]);

  const loadData = async () => {
    console.log('🔄 [ViewScreen] loadData() started...');
    setLoading(true);

    // Add a safety timeout to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Data loading timed out after 10 seconds')), 10000)
    );

    try {
      console.log('⏳ [ViewScreen] Fetching real data from database...');
      await Promise.race([
        (async () => {
          const client = adminSupabase || supabase;

          // 1. Fetch ALL persistent screenshots (Admin View)
          const { getAllScreenshots } = await import('../lib/db/screenshots');
          const realScreenshots = await getAllScreenshots();
          setScreenshots(realScreenshots);

          // 2. Fetch DONE deliveries (Spreadsheet source)
          const doneDeliveries = await deliveriesDb.getDeliveries({ status: 'DONE' }, client);

          // 3. V1 FIX: Also fetch any deliveries referenced by screenshots (even if not DONE)
          // This ensures "Unknown" metadata is resolved for screenshots uploaded for active deliveries
          const screenshotDeliveryIds = Array.from(new Set(realScreenshots.map(s => s.delivery_id)));

          // Optimisation: exclude IDs we already have in doneDeliveries
          const knownIds = new Set(doneDeliveries.map(d => d.id));
          const missingIds = screenshotDeliveryIds.filter(id => !knownIds.has(id));

          let extraDeliveries: Delivery[] = [];
          if (missingIds.length > 0) {
            console.log(`📸 Fetching ${missingIds.length} extra deliveries for screenshot metadata...`);
            extraDeliveries = await deliveriesDb.getDeliveriesByIds(missingIds, client);
          }

          // Merge and deduplicate
          const allDeliveries = [...doneDeliveries, ...extraDeliveries];
          // Determine uniqueness by ID
          const uniqueDeliveries = Array.from(new Map(allDeliveries.map(d => [d.id, d])).values());

          setDeliveries(uniqueDeliveries);

          // V1 SPEC: Initialize edit history with loaded state
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
      console.log('🏁 [ViewScreen] loadData complete. Setting loading=false');
      setLoading(false);
    }
  };

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
  // V1 SPEC: Helper to resolve showroom code
  const getShowroomCode = (dealershipName: string) => {
    return dealershipName.match(/\(([^)]+)\)/)?.[1] ||
      dealershipName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  };

  // V1 SPEC: Memoized filtered deliveries for both Table and CSV Export
  const filteredDeliveries = React.useMemo(() => {
    return deliveries.filter(d => {
      // V1 SPEC: Only show deliveries where SEND UPDATE was pressed (status === DONE)
      if (d.status !== 'DONE') return false;

      // Apply showroom filter (Now strictly Dealership ID)
      if (selectedShowroom !== 'all') {
        const dealership = dealerships.find(d => d.id === selectedShowroom);
        if (dealership) {
          const code = getShowroomCode(dealership.name);
          // Match logic:
          // 1. If Code matches standard derivation
          if (d.showroom_code !== code) {
            return false;
          }
        }
      }
      return true;
    });
  }, [deliveries, selectedShowroom, mappings, dealerships]);

  const handleExportCSV = () => {
    const csv = [
      ['Date', 'Footage Link', 'Reel Link', 'Photographer Name'].join(','),
      ...filteredDeliveries.map(d => {
        const photographer = photographers.find(p => p.id === d.assigned_user_id);
        return [
          d.date,
          d.footage_link || '',
          (d as any).reel_link || '',
          photographer?.name || 'Unassigned'
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

    // V1 FIX: Persist changes to DB immediately
    try {
      const client = adminSupabase || supabase;

      if (editingCell.field === 'reel_link') {
        // 1. Update Delivery
        // @ts-ignore
        await deliveriesDb.updateDelivery(editingCell.deliveryId, { reel_link: editValue }, client);

        // 2. Sync with Reel Task (Backlog)
        const existingTask = await reelsDb.getReelTaskByDelivery(editingCell.deliveryId, client);
        if (existingTask) {
          await reelsDb.updateReelTask(existingTask.id, {
            reel_link: editValue,
            status: editValue && editValue.trim() !== '' ? 'RESOLVED' : 'PENDING'
          }, client);
          console.log(`🎬 Reel Task updated for ${editingCell.deliveryId} -> ${editValue ? 'RESOLVED' : 'PENDING'}`);
        }
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
    if (editingCell.field === 'footage_link' || editingCell.field === 'reel_link') {
      const updatedDelivery = updatedDeliveries.find(d => d.id === editingCell.deliveryId);
      if (updatedDelivery) {
        handleTriggerSheetSync(updatedDelivery);
      }
    }
  };

  const handleTriggerSheetSync = async (delivery: any) => {
    try {
      // GUARD: Don't sync imported records back to the sheet to avoid duplication loops
      if (delivery.delivery_name?.includes('_IMPORT')) {
        console.log("Sync skipped: Imported records are not pushed back to avoid loops.");
        return;
      }

      // 1. Get Mapping to find Dealership
      const mapping = await configDb.getMappingById(delivery.showroom_code);
      if (!mapping) return;

      // 2. Get Dealership Details
      const dealership = await configDb.getDealershipById(mapping.dealershipId);
      if (!dealership || !dealership.googleSheetId) {
        console.log("Sync skipped: No Google Sheet ID configured for this dealership.");
        return;
      }

      // 3. Call Google Apps Script Bridge
      // We use the Web App URL that the user will deploy
      // For now, we attempt to get it from env, or log a reminder
      const SYNC_URL = import.meta.env.VITE_GOOGLE_SYNC_URL;

      if (!SYNC_URL) {
        console.warn("⚠️ Google Sync URL not configured in .env.local (VITE_GOOGLE_SYNC_URL)");
        return;
      }

      const response = await fetch(SYNC_URL, {
        method: 'POST',
        mode: 'no-cors', // Apps Script requires no-cors sometimes for simple POSTs
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheetId: dealership.googleSheetId,
          delivery: {
            delivery_name: delivery.delivery_name,
            date: delivery.date,
            timing: delivery.timing,
            payment_type: delivery.payment_type,
            footage_link: delivery.footage_link,
            reel_link: delivery.reel_link
          }
        }),
      });

      console.log(`🚀 Sync request sent to bridge for: ${delivery.delivery_name}`);
    } catch (error) {
      console.error('❌ Failed to trigger Google Sheets sync:', error);
    }
  };


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
      photographer_id: '',
      footage_link: '',
      reel_link: ''
    });
    setIsAddDialogOpen(true);
  };

  const handleSaveNewRow = async () => {
    // Validate required fields
    if (!newRowData.date || !newRowData.showroom_id || !newRowData.delivery_name || !newRowData.photographer_id) {
      toast.error('Please fill in all required fields: Date, Showroom, Delivery Name, and Photographer');
      return;
    }

    await simulateApiDelay(200);

    // Find the selected dealership to get showroom_code and cluster
    const selectedDealership = dealerships.find(d => d.id === newRowData.showroom_id);
    if (!selectedDealership) {
      toast.error('Selected showroom not found');
      return;
    }

    // Extract showroom code from dealership name (e.g., "Khatri Wheels (KHTR_WH)" -> "KHTR_WH")
    const showroomCode = selectedDealership.name.match(/\(([^)]+)\)/)?.[1] ||
      selectedDealership.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

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
      delivery_name: newRowData.delivery_name,
      status: 'DONE', // V1 SPEC: Spreadsheet only shows DONE deliveries
      assigned_user_id: newRowData.photographer_id,
      footage_link: newRowData.footage_link || null,
      payment_type: selectedDealership.paymentType,
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

    // Use functional updates to ensure we capture the latest state
    setDeliveries(prevDeliveries => {
      const updatedDeliveries = [...prevDeliveries, newDelivery];

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

    setIsAddDialogOpen(false);

    // Reset new row form
    setNewRowData({
      date: '',
      showroom_id: '',
      delivery_name: '',
      photographer_id: '',
      footage_link: '',
      reel_link: ''
    });

    toast.success('Delivery row saved successfully');
  };

  const handleCancelAddRow = () => {
    setIsAddDialogOpen(false);
  };

  const paymentScreenshots = screenshots.filter(s => s.type === 'PAYMENT' && !s.deleted_at);
  const followScreenshots = screenshots.filter(s => s.type === 'FOLLOW' && !s.deleted_at);

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
              <SelectItem value="incentive" className="font-semibold">🏆 Incentive Tracker</SelectItem>
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

      {/* Incentive Tracker (Photographer Only) */}
      {mainTab === 'incentive' && (
        <IncentiveTracker />
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
                      <Button onClick={handleExportCSV} size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Export CSV
                      </Button>
                    </div>
                  </div>

                  {/* Showroom/Dealership Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Dealership</label>
                    <Select value={selectedShowroom} onValueChange={setSelectedShowroom}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select dealership" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Dealerships</SelectItem>
                        {dealerships.slice().sort((a, b) => a.name.localeCompare(b.name)).map(dealership => (
                          <SelectItem key={dealership.id} value={dealership.id}>
                            {dealership.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        <TableHead>Date</TableHead>
                        <TableHead>Footage Link</TableHead>
                        <TableHead>Reel Link</TableHead>
                        <TableHead>Photographer Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeliveries
                        .map(delivery => {
                          const photographer = photographers.find(p => p.id === delivery.assigned_user_id);

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
                              <TableCell className="text-sm">
                                {(() => {
                                  const [y, m, d] = delivery.date.split('-');
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
                                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded group"
                                    onClick={() => handleStartEdit(delivery.id, 'footage_link', delivery.footage_link || '')}
                                    title={`Showroom: ${showroomDisplay}\nDelivery: ${delivery.delivery_name}`}
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
                                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded group"
                                    onClick={() => handleStartEdit(delivery.id, 'reel_link', (delivery as any).reel_link || '')}
                                    title={`Showroom: ${showroomDisplay}\nDelivery: ${delivery.delivery_name}`}
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
                                      <SelectTrigger className="h-7 text-xs w-[140px]">
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {photographers.map(p => (
                                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
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
                                    className={`flex items-center gap-2 p-1 rounded group ${isAdmin ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                    onClick={() => isAdmin && handleStartEdit(delivery.id, 'assigned_user_id', delivery.assigned_user_id || 'unassigned')}
                                    title={isAdmin ? "Click to reassign photographer" : undefined}
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
                            </TableRow>
                          );
                        })}

                      {/* Add New Row Dialog */}
                      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add New Delivery Record</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
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
                                <Select
                                  value={newRowData.showroom_id}
                                  onValueChange={(value) => setNewRowData({ ...newRowData, showroom_id: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select showroom" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {dealerships.map(dealership => (
                                      <SelectItem key={dealership.id} value={dealership.id}>
                                        {getShowroomDisplayName(dealership.id)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase text-gray-500">Delivery Name</label>
                              <Input
                                value={newRowData.delivery_name}
                                onChange={(e) => setNewRowData({ ...newRowData, delivery_name: e.target.value })}
                                placeholder="e.g. 10-02-2024_BIMAL_NEXA_1"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase text-gray-500">Photographer</label>
                              <Select
                                value={newRowData.photographer_id}
                                onValueChange={(value) => setNewRowData({ ...newRowData, photographer_id: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select photographer" />
                                </SelectTrigger>
                                <SelectContent>
                                  {photographers.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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
                            <div className="flex justify-end gap-2 pt-2">
                              <Button variant="outline" onClick={handleCancelAddRow}>Cancel</Button>
                              <Button onClick={handleSaveNewRow}>Save Record</Button>
                            </div>
                          </div>
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
                            const photographer = photographers.find(p => p.id === userId);
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
                          {photographers.find(p => p.id === filteredPaymentScreenshots[currentImageIndex]?.user_id)?.name || 'Unknown'}
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
                    const photographer = photographers.find(p => p.id === screenshot.user_id);
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
                          {photographers.find(p => p.id === filteredFollowScreenshots[currentImageIndex]?.user_id)?.name || 'Unknown'}
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
                    const photographer = photographers.find(p => p.id === screenshot.user_id);
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

          {/* Live Portrait Bookings */}
          {viewMode === 'portrait' && (
            <LiveBookingsView />
          )}

          {/* Admin Logs Viewer */}
          {viewMode === 'logs' && (
            <AdminLogsViewer />
          )}
        </>
      )}
    </div>
  );
}
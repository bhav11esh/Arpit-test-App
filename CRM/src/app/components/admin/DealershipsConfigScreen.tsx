import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useNavigate } from 'react-router-dom';
import * as deliveriesDb from '../../lib/db/deliveries';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ArrowLeft, Plus, Edit, Save, Trash2, Building2, Search, Map, Check, X, AlertCircle, AlertTriangle, RefreshCw, Download, Code } from 'lucide-react';
import { getShowroomCode } from '../../lib/utils';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import * as reelsDb from '../../lib/db/reels';
import * as screenshotsDb from '../../lib/db/screenshots';
import { supabase } from '../../lib/supabase';
import type { Dealership, PaymentType } from '../../types';
import { formatDateForSheet, getDeliverySignature } from '../../lib/utils';

export function DealershipsConfigScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dealerships, addDealership, updateDealership, deleteDealership, mappings, photographers, clusters } =
    useConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDealership, setEditingDealership] = useState<Dealership | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [dealershipToDelete, setDealershipToDelete] = useState<Dealership | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    paymentType: 'CUSTOMER_PAID' as PaymentType,
    googleSheetId: '',
    googleSyncUrl: '',
    ratePerDelivery: '',
    city: '',
  });

  // Filter by city
  const filteredDealerships = user?.role === 'ADMIN' && user?.city
    ? dealerships.filter(d => (d as any).city === user.city)
    : dealerships;

  const handleOpenDialog = (dealership?: Dealership) => {
    if (dealership) {
      setEditingDealership(dealership);
      setFormData({
        name: dealership.name,
        paymentType: dealership.paymentType,
        googleSheetId: dealership.googleSheetId || '',
        googleSyncUrl: dealership.googleSyncUrl || '',
        ratePerDelivery: dealership.ratePerDelivery?.toString() || '',
        city: (dealership as any).city || '',
      });
    } else {
      setEditingDealership(null);
      setFormData({
        name: '',
        paymentType: 'CUSTOMER_PAID',
        googleSheetId: '',
        googleSyncUrl: '',
        ratePerDelivery: '',
        city: user?.city || '', // Default to admin's city
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDealership(null);
    setFormData({
      name: '',
      paymentType: 'CUSTOMER_PAID',
      googleSheetId: '',
      googleSyncUrl: '',
      ratePerDelivery: '',
      city: '',
    });
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Dealership name is required');
      return;
    }
    if (!formData.city.trim()) {
      toast.error('City is required');
      return;
    }

    if (editingDealership) {
      updateDealership(editingDealership.id, {
        name: formData.name.trim(),
        paymentType: formData.paymentType,
        googleSheetId: formData.googleSheetId.trim() || undefined,
        googleSyncUrl: formData.googleSyncUrl.trim() || undefined,
        ratePerDelivery: formData.paymentType === 'DEALER_PAID' ? parseFloat(formData.ratePerDelivery) || 0 : undefined,
        city: formData.city.trim(),
      } as any);
      toast.success('Dealership updated successfully');
    } else {
      addDealership({
        name: formData.name.trim(),
        paymentType: formData.paymentType,
        googleSheetId: formData.googleSheetId.trim() || undefined,
        googleSyncUrl: formData.googleSyncUrl.trim() || undefined,
        ratePerDelivery: formData.paymentType === 'DEALER_PAID' ? parseFloat(formData.ratePerDelivery) || 0 : undefined,
        city: formData.city.trim(),
      } as any);
      toast.success('Dealership added successfully');
    }

    handleCloseDialog();
  };

  const handleDeleteClick = (dealership: Dealership) => {
    // Check if dealership has mappings
    const dealershipMappings = mappings.filter(m => m.dealershipId === dealership.id);
    if (dealershipMappings.length > 0) {
      toast.error(
        `Cannot delete dealership. ${dealershipMappings.length} mapping(s) depend on it. Delete those first.`
      );
      return;
    }
    setDealershipToDelete(dealership);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (dealershipToDelete) {
      deleteDealership(dealershipToDelete.id);
      toast.success('Dealership deleted successfully');
      setDeleteConfirmOpen(false);
      setDealershipToDelete(null);
    }
  };

  const handleBulkSync = async (dealership: Dealership) => {
    if (!dealership.googleSheetId) {
      toast.error('No Google Sheet ID configured for this dealership.');
      return;
    }

    const syncUrl = dealership.googleSyncUrl || import.meta.env.VITE_GOOGLE_SYNC_URL;
    if (!syncUrl) {
      toast.error('Google Sync URL not configured.');
      return;
    }

    toast.info(`Preparing bulk sync for ${dealership.name}...`);

    try {
      const dealershipMappings = mappings.filter(m => m.dealershipId === dealership.id);
      const dealershipDeliveries = await deliveriesDb.getDeliveries();

      const targetCode = getShowroomCode(dealership.name);

      const relevantDeliveries = dealershipDeliveries.filter((d: any) => {
        // Match 1: By mapping ID (manual creation)
        if (dealershipMappings.some(m => m.id === d.showroom_code)) return true;
        // Match 2: By text code (imports and ViewScreen logic) - V1.1: Case-insensitive match for showroom_code
        if (getShowroomCode(d.showroom_code) === targetCode) return true;
        return false;
      });

      if (relevantDeliveries.length === 0) {
        toast.warning('No historical records found for this dealership.');
        return;
      }

      const response = await fetch(syncUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'sync_bulk', // V6.0: Use bulk action for efficiency
          sheetId: dealership.googleSheetId,
          deliveries: relevantDeliveries.map(d => {
            const photographer = photographers.find(p => p.id === d.assigned_user_id);
            const sig = getDeliverySignature(d, photographer?.name || '');
            return {
              signature: sig,
              oldSignature: sig,
              delivery_name: d.delivery_name,
              date: formatDateForSheet(d.date),
              timing: d.timing,
              payment_type: d.payment_type,
              footage_link: d.footage_link,
              reel_link: d.reel_link,
              photographer_name: photographer?.name || '',
              received_amount: d.received_amount || '',
              customer_phone: d.customer_phone || '',
              rapido_charge: d.rapido_charge || ''
            };
          })
        })
      });

      toast.success(`Sent ${relevantDeliveries.length} records to sync bridge!`);
    } catch (error) {
      console.error('Bulk sync failed:', error);
      toast.error('Failed to initiate bulk sync.');
    }
  };

  const handleImportFromSheet = async (dealership: Dealership) => {
    console.log('🚀 [Refresh Trace] Starting handleImportFromSheet for:', dealership?.name);
    
    if (!dealership || !dealership.id) {
      console.error('❌ [Refresh Trace] Invalid dealership object:', dealership);
      toast.error('Cannot import: Invalid dealership data');
      return;
    }

    if (!dealership.googleSheetId) {
      console.warn('⚠️ [Refresh Trace] Missing Sheet ID for:', dealership.name);
      toast.error('No Google Sheet ID configured for this dealership.');
      return;
    }

    const confirm = window.confirm(
      `CRITICAL ACTION: This will delete ALL current CRM records for "${dealership.name}" and re-import them fresh from Google Sheets. Continue?`
    );
    if (!confirm) {
      console.log('ℹ️ [Refresh Trace] User cancelled import');
      return;
    }

    const syncUrl = dealership.googleSyncUrl || import.meta.env.VITE_GOOGLE_SYNC_URL;
    if (!syncUrl) {
      console.error('❌ [Refresh Trace] Missing sync URL');
      toast.error('Google Sync URL not configured.');
      return;
    }

    const toastId = toast.loading(`Refreshing records for ${dealership.name}...`);
    console.log('ℹ️ [Refresh Trace] Toast started, loading...');

    try {
      // 1. Precise Wipe for this dealership
      const getShowroomCodeLocal = (name: string) => {
        if (!name) return 'UNKNOWN';
        const matches = name.match(/\(([^)]+)\)/);
        return matches ? matches[1].toUpperCase() : name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      };
      
      const showroomCode = getShowroomCodeLocal(dealership.name);
      console.log('ℹ️ [Refresh Trace] Showroom Code:', showroomCode);
      
      console.log('ℹ️ [Refresh Trace] Fetching existing deliveries to wipe...');
      const { data: targetDeliveries, error: fetchError } = await supabase.from('deliveries').select('id').eq('showroom_code', showroomCode);
      if (fetchError) {
        console.error('❌ [Refresh Trace] Supabase Fetch Error:', fetchError);
        throw fetchError;
      }
      
      console.log('ℹ️ [Refresh Trace] Existing records found:', targetDeliveries?.length || 0);
      const deliveryIds = (targetDeliveries || []).filter((d: any) => d && d.id).map((d: any) => d.id);
      
      if (deliveryIds.length > 0) {
        console.log('ℹ️ [Refresh Trace] Deleting associated records for', deliveryIds.length, 'IDs');
        await reelsDb.deleteReelTasksByDeliveryIds(deliveryIds);
        await screenshotsDb.deleteScreenshotsByDeliveryIds(deliveryIds, supabase);
        await deliveriesDb.deleteDeliveriesByShowroomCode(showroomCode);
        console.log('✅ [Refresh Trace] Wipe complete');
      } else {
        console.log('ℹ️ [Refresh Trace] No records to wipe');
      }

      // 2. Fetch from Sheet
      console.log('ℹ️ [Refresh Trace] Fetching from Sheet via Sync Bridge...');
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          action: 'read',
          sheetId: dealership.googleSheetId
        })
      });
      console.log('ℹ️ [Refresh Trace] Sheet Response status:', response.status);
      
      const result = await response.json();
      console.log('ℹ️ [Refresh Trace] Sheet parse complete. Status:', result?.status);

      if (!result || result.status !== 'success' || !Array.isArray(result.data)) {
        console.error('❌ [Refresh Trace] Sheet Data Error:', result?.message);
        throw new Error(result?.message || 'Failed to fetch sheet data');
      }

      console.log('ℹ️ [Refresh Trace] Raw data rows received:', result.data.length);
      let rawRows = result.data;
      
      // V7.8 FIX: If Apps Script returns raw Array of Arrays, convert to Array of Objects
      if (Array.isArray(rawRows) && rawRows.length > 0 && Array.isArray(rawRows[0])) {
        console.log('ℹ️ [Refresh Trace] Converting Array of Arrays to objects');
        const headers = rawRows[0];
        rawRows = rawRows.slice(1).map((row: any) => {
          const obj: any = {};
          if (Array.isArray(row)) {
            headers.forEach((h: string, i: number) => {
              if (h) obj[h.trim()] = row[i];
            });
          }
          return obj;
        });
      }

      // 🛠️ V8.3 Normalization: Trim all keys and values to defend against "Date " or " Chassis Number"
      console.log('ℹ️ [Refresh Trace] Normalizing rows...');
      const rows = rawRows.map((r: any) => {
        if (!r || typeof r !== 'object') return {};
        const normalized: any = {};
        Object.keys(r).forEach(key => {
          if (key) {
            const cleanKey = key.trim();
            normalized[cleanKey] = typeof r[key] === 'string' ? r[key].trim() : r[key];
          }
        });
        return normalized;
      });

      console.log('ℹ️ [Refresh Trace] Looking up mappings and clusters...');
      const dealershipMappings = (mappings || []).filter(m => m && m.dealershipId === (dealership?.id || ''));
      console.log('ℹ️ [Refresh Trace] Found mappings:', dealershipMappings.length);
      
      const cluster = (dealershipMappings.length > 0 && (clusters || []).length > 0) 
        ? (clusters || []).find(c => c && c.id === dealershipMappings[0].clusterId) 
        : null;
      console.log('ℹ️ [Refresh Trace] Target Cluster:', cluster?.name || 'UNKNOWN');
      
      const mapping = dealershipMappings[0];

      // 3. Map and Batch Insert
      console.log('ℹ️ [Refresh Trace] Parsing dates and mapping rows...');
      const parseDateLocal = (dStr: any) => {
        if (!dStr) return null;
        
        // Handle numeric dates (Google Sheets/Excel format)
        if (typeof dStr === 'number') {
          try {
            const date = new Date(Math.round((dStr - 25569) * 86400 * 1000));
            if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
          } catch (e) {}
        }

        const trimmed = typeof dStr === 'string' ? dStr.trim() : String(dStr);
        let resultParsed: string | null = null;
        
        // Pre-normalize dashes (handle en-dash \u2013 and em-dash \u2014)
        const normalizedTrimmed = trimmed.replace(/[\u2013\u2014]/g, '-');

        // 1. Handle DD-MM-YYYY or DD/MM/YYYY with flexible spaces
        const dmyMatch = normalizedTrimmed.match(/^(\d{1,2})\s*[\s\-\.\/]\s*(\d{1,2})\s*[\s\-\.\/]\s*(\d{2,4})/);
        if (dmyMatch) {
          let [_, d, m, y] = dmyMatch;
          if (y.length === 2) y = '20' + y;
          resultParsed = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }

        // 2. Handle ISO strings produced by GAS
        if (!resultParsed && trimmed.includes('T') && trimmed.includes('Z')) {
          try {
            const date = new Date(trimmed);
            if (!isNaN(date.getTime())) {
              const localDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
              resultParsed = localDate.toISOString().split('T')[0];
            }
          } catch (e) {}
        }

        // 3. Final fallback: try native Date parsing
        if (!resultParsed) {
          try {
            const nativeDate = new Date(normalizedTrimmed);
            if (!isNaN(nativeDate.getTime())) {
              resultParsed = nativeDate.toISOString().split('T')[0];
            }
          } catch (e) {}
        }

        // Year Guardrail (2020-2100)
        if (resultParsed) {
          const yearNum = parseInt(resultParsed.split('-')[0]);
          if (yearNum < 2020 || yearNum > 2100) return null;
        }

        return resultParsed;
      };

      const getValueLocal = (row: any, ...keys: string[]) => {
        if (!row || typeof row !== 'object') return null;
        for (const key of keys) {
          if (!key) continue;
          if (row[key] !== undefined) return row[key];
          // Try case-insensitive search
          const foundKey = Object.keys(row).find(k => k && k.toLowerCase() === key.toLowerCase());
          if (foundKey) return row[foundKey];
        }
        return null;
      };

      const mappedRows = rows.filter((row: any) => {
        if (!row) return false;
        const rawDate = getValueLocal(row, "Date", "date") || "";
        const parsedDate = parseDateLocal(rawDate);
        
        // Skip if header row or if date is invalid/empty
        if (!parsedDate || (typeof parsedDate === 'string' && parsedDate.toLowerCase().includes('date'))) return false;
        
        // Ensure at least one other column has data
        const hasData = Object.keys(row).some(key => {
          if (!key) return false;
          if (key.toLowerCase() === 'date' || key === '_parsedDate') return false;
          return !!row[key];
        });
        
        row._parsedDate = parsedDate;
        return hasData;
      }).map((row: any, index: number) => {
        const photographerName = (getValueLocal(row, "Photographer", "Photographer name", "Photographer Name") || "").trim();
        const photographer = (photographers || []).find(p => 
          p && p.name && photographerName && (
            p.name.toLowerCase().includes(photographerName.toLowerCase()) || 
            photographerName.toLowerCase().includes(p.name.toLowerCase())
          )
        );

        return {
          date: row._parsedDate,
          showroom_code: showroomCode,
          cluster_code: cluster?.name || 'UNKNOWN',
          showroom_type: mapping?.mappingType || 'SECONDARY',
          timing: 'TBD',
          delivery_name: getValueLocal(row, "Customer Name", "Customer") || `Delivery_${row._parsedDate}_${index}`,
          status: 'DONE',
          assigned_user_id: photographer?.id || null,
          payment_type: dealership?.paymentType || 'CUSTOMER_PAID',
          footage_link: getValueLocal(row, "Footage Link", "Footage link") || null,
          reel_link: getValueLocal(row, "Reel Link", "Reel link") || null,
          received_amount: getValueLocal(row, "Amount Received", "Received Amount") || null,
          customer_phone: getValueLocal(row, "Phone Number", "Customer Phone") || null,
          rapido_charge: getValueLocal(row, "Rapido Charge") || null
        };
      });

      console.log('ℹ️ [Refresh Trace] Mapped valid rows:', mappedRows.length);

      if (mappedRows.length > 0) {
        console.log('ℹ️ [Refresh Trace] Batch inserting to deliveries table...');
        const chunkSize = 100;
        for (let i = 0; i < mappedRows.length; i += chunkSize) {
          const chunk = mappedRows.slice(i, i + chunkSize);
          const { error: insertError } = await supabase.from('deliveries').insert(chunk);
          if (insertError) {
            console.error('❌ [Refresh Trace] Batch Insert Error:', insertError);
            throw insertError;
          }
        }
        console.log('✅ [Refresh Trace] Database update successful');
      }

      toast.success(`Successfully refreshed ${mappedRows.length} records for ${dealership.name}!`, { id: toastId });
      console.log('🎉 [Refresh Trace] Refresh sequence complete. Reloading...');
      setTimeout(() => window.location.reload(), 1000);
      
    } catch (error: any) {
      console.error('❌ [Refresh Trace] FATAL ERROR:', error);
      console.error('❌ [Refresh Trace] Stack Trace:', error?.stack);
      toast.error(`Refresh failed: ${error?.message || 'Unknown error. Check console for details.'}`, { id: toastId });
    }
  };


  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/config')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Dealerships</h1>
            <p className="text-sm text-gray-600">
              Manage showrooms and dealership locations
            </p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Dealership
        </Button>
      </div>

      <div className="grid gap-4">
        {filteredDealerships.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No dealerships configured. Click "Add Dealership" to create one.
            </CardContent>
          </Card>
        ) : (
          filteredDealerships.map(dealership => {
            const dealershipMappingCount = (mappings || []).filter(
              m => m && m.dealershipId === dealership.id
            ).length;

            return (
              <Card key={dealership.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Building2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle>{dealership.name}</CardTitle>
                          {(dealership as any).city && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">
                              {(dealership as any).city}
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                dealership.paymentType === 'CUSTOMER_PAID'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }
                            >
                              {dealership.paymentType === 'CUSTOMER_PAID'
                                ? 'Customer Paid'
                                : 'Dealer Paid'}
                            </Badge>
                            <span className="text-green-600">
                              {dealershipMappingCount} mapping(s) configured
                            </span>
                            {dealership.paymentType === 'DEALER_PAID' && dealership.ratePerDelivery !== undefined && (
                              <Badge className="bg-green-100 text-green-800 ml-2">
                                Rate: ₹{dealership.ratePerDelivery}
                              </Badge>
                            )}
                          </div>
                          {dealership.googleSheetId && (
                            <div className="flex items-center gap-1 text-xs text-blue-600 font-mono">
                              <span className="opacity-70 text-[10px] uppercase tracking-wider">Sync:</span>
                              <span className="truncate max-w-[200px]">{dealership.googleSheetId}</span>
                            </div>
                          )}
                          {dealership.googleSyncUrl && (
                            <div className="flex items-center gap-1 text-[10px] text-green-600 font-mono italic">
                              <Code className="h-3 w-3" />
                              <span className="truncate max-w-[250px]">{dealership.googleSyncUrl}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleImportFromSheet(dealership)}
                        title="Import existing records FROM Google Sheet"
                      >
                        <Download className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleBulkSync(dealership)}
                        title="Push ALL CRM records TO Google Sheet"
                      >
                        <RefreshCw className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(dealership)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(dealership)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDealership ? 'Edit Dealership' : 'Add New Dealership'}
            </DialogTitle>
            <DialogDescription>
              Configure dealership details and payment type
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Dealership Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Bimal Nexa"
              />
            </div>

            <div>
              <Label htmlFor="paymentType">Payment Type</Label>
              <Select
                value={formData.paymentType}
                onValueChange={(value: PaymentType) =>
                  setFormData({ ...formData, paymentType: value })
                }
              >
                <SelectTrigger id="paymentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER_PAID">Customer Paid</SelectItem>
                  <SelectItem value="DEALER_PAID">Dealer Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.paymentType === 'DEALER_PAID' && (
              <div>
                <Label htmlFor="ratePerDelivery">Rate Per Delivery (Rs)</Label>
                <Input
                  id="ratePerDelivery"
                  type="number"
                  value={formData.ratePerDelivery}
                  onChange={e => setFormData({ ...formData, ratePerDelivery: e.target.value })}
                  placeholder="e.g., 700"
                />
              </div>
            )}

            <div>
              <Label htmlFor="googleSheetId">Google Sheet ID (for Client Sync)</Label>
              <Input
                id="googleSheetId"
                value={formData.googleSheetId}
                onChange={e => setFormData({ ...formData, googleSheetId: e.target.value })}
                placeholder="E.g. 1aBcDeFgHiJk..."
                className="font-mono text-sm"
              />
              <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">
                Paste the ID from the sheet URL between /d/ and /edit
              </p>
            </div>

            <div>
              <Label htmlFor="googleSyncUrl">Google Sync URL (Optional Override)</Label>
              <Input
                id="googleSyncUrl"
                value={formData.googleSyncUrl}
                onChange={e => setFormData({ ...formData, googleSyncUrl: e.target.value })}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="font-mono text-sm"
              />
              <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">
                Specific Apps Script URL for this dealership. Leaves blank to use global default.
              </p>
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value.toLowerCase() })}
                placeholder="e.g., bengaluru"
              />
              <p className="text-[10px] text-gray-500 mt-1">Use lowercase, e.g., "bengaluru"</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingDealership ? 'Update' : 'Add'} Dealership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete dealership "
              {dealershipToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

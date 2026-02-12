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
import { ArrowLeft, Plus, Edit, Trash2, Building2, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import type { Dealership, PaymentType } from '../../types';

export function DealershipsConfigScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dealerships, addDealership, updateDealership, deleteDealership, mappings, photographers } =
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
  });

  // Admin-only access guard
  if (user?.role !== 'ADMIN') {
    toast.error('Access denied. Admin privileges required.');
    navigate('/');
    return null;
  }

  const handleOpenDialog = (dealership?: Dealership) => {
    if (dealership) {
      setEditingDealership(dealership);
      setFormData({
        name: dealership.name,
        paymentType: dealership.paymentType,
        googleSheetId: dealership.googleSheetId || '',
      });
    } else {
      setEditingDealership(null);
      setFormData({
        name: '',
        paymentType: 'CUSTOMER_PAID',
        googleSheetId: '',
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
    });
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Dealership name is required');
      return;
    }

    if (editingDealership) {
      updateDealership(editingDealership.id, {
        name: formData.name.trim(),
        paymentType: formData.paymentType,
        googleSheetId: formData.googleSheetId.trim() || undefined,
      });
      toast.success('Dealership updated successfully');
    } else {
      addDealership({
        name: formData.name.trim(),
        paymentType: formData.paymentType,
        googleSheetId: formData.googleSheetId.trim() || undefined,
      });
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

    const syncUrl = import.meta.env.VITE_GOOGLE_SYNC_URL;
    if (!syncUrl) {
      toast.error('Google Sync URL not configured in environment.');
      return;
    }

    toast.info(`Preparing bulk sync for ${dealership.name}...`);

    try {
      const dealershipMappings = mappings.filter(m => m.dealershipId === dealership.id);
      const dealershipDeliveries = await deliveriesDb.getDeliveries();

      const relevantDeliveries = dealershipDeliveries.filter((d: any) =>
        dealershipMappings.some(m => m.id === d.showroom_code)
      );

      if (relevantDeliveries.length === 0) {
        toast.warning('No historical records found for this dealership.');
        return;
      }

      const response = await fetch(syncUrl, {
        method: 'POST',
        body: JSON.stringify({
          sheetId: dealership.googleSheetId,
          deliveries: relevantDeliveries.map(d => ({
            delivery_name: d.delivery_name,
            date: d.date,
            timing: d.timing,
            payment_type: d.payment_type,
            footage_link: d.footage_link,
            reel_link: d.reel_link
          }))
        })
      });

      toast.success(`Sent ${relevantDeliveries.length} records to sync bridge!`);
    } catch (error) {
      console.error('Bulk sync failed:', error);
      toast.error('Failed to initiate bulk sync.');
    }
  };

  const handleImportFromSheet = async (dealership: Dealership) => {
    if (!dealership.googleSheetId) {
      toast.error('No Google Sheet ID configured for this dealership.');
      return;
    }

    const syncUrl = import.meta.env.VITE_GOOGLE_SYNC_URL;
    if (!syncUrl) {
      toast.error('Google Sync URL not configured in environment.');
      return;
    }

    toast.info(`[v4.2-ULTIMATE] Fetching records from ${dealership.name} Google Sheet...`);

    try {
      const response = await fetch(syncUrl, {
        method: 'POST',
        body: JSON.stringify({
          sheetId: dealership.googleSheetId,
          action: 'read'
        })
      });
      const result = await response.json();

      if (result.status !== 'success') {
        throw new Error(result.message || 'Failed to fetch data');
      }

      const rows = result.data;
      const scriptVersion = result.version || 'unknown';
      const sheetNameFound = (result as any).sheetName || 'Unknown';

      console.log('📊 [Import] Script Version:', scriptVersion);
      console.log('📊 [Import] Sheet accessed:', sheetNameFound);
      console.log('📊 [Import] Rows received:', rows?.length || 0);

      if (!rows || rows.length === 0) {
        toast.warning(`No records found in sheet "${sheetNameFound}". (Script: ${scriptVersion})`);
        return;
      }

      // Find the primary showroom for this dealership
      const dealershipMappings = mappings.filter(m => m.dealershipId === dealership.id);
      if (dealershipMappings.length === 0) {
        toast.error('No showroom mappings found for this dealership. Cannot import.');
        return;
      }
      const defaultShowroom = dealershipMappings[0];

      toast.info(`Parsing ${rows.length} records from "${sheetNameFound}"...`);
      console.log('📋 [V4.2-ULTIMATE] RAW SHEET DATA:', rows);
      console.table(rows.slice(0, 5)); // Show first 5 rows for quick audit

      // Get existing deliveries for this dealership to avoid duplicates
      const existingDeliveries = await deliveriesDb.getDeliveries({
        showroomCode: defaultShowroom.id
      });
      const existingNames = new Set(existingDeliveries.map(d => d.delivery_name));

      let importCount = 0;
      let skipCount = 0;
      // V1 FIX: Use index to ensure uniqueness for same-day/same-photographer deliveries
      for (const [index, row] of rows.entries()) {
        // Robust helper to find value regardless of case or trailing spaces in headers
        const getVal = (key: string) => {
          const actualKey = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
          return actualKey ? row[actualKey] : null;
        };

        const dateVal = getVal('Date');
        const footageLink = getVal('Footage Link');
        const reelLink = getVal('Reel Link');
        const photographerNameRaw = getVal('Photographer');

        // Skip empty rows or header-like rows
        // Skip empty rows or header-like rows
        if (!dateVal || dateVal === 'Date' || dateVal === 'Original Dates') continue;
        // V4.4 FIX: Allow import even if links are missing (Draft status)
        // if (!footageLink && !reelLink) continue;

        // 1. Parse Date (supporting DD-MM-YYYY and textual dates from Google)
        // Since we use getDisplayValues in V4.2, we get exactly "08-12-2025"
        let dateStr = String(dateVal || '').trim();
        if (!dateStr || dateStr.toLowerCase() === 'date') continue;

        let finalDate = '';
        // Handle DD-MM-YYYY or DD-MM-YY (Standard in Bimal sheet)
        // V4.3 FIX: Handle suffixes like _1, _2, _3 (e.g. "14-08-2025_1")
        dateStr = dateStr.replace(/_\d+$/, '').trim();

        // Handle DD-MM-YYYY or DD-MM-YY with flexible separators (hyphen, dot, slash, space, en-dash, em-dash)
        // \u2013 is en-dash, \u2014 is em-dash
        const dmyMatch = dateStr.match(/^(\d{1,2})[\s\-\/\.\u2013\u2014]+(\d{1,2})[\s\-\/\.\u2013\u2014]+(\d{2,4})/);

        if (dmyMatch) {
          let [_, dStr, mStr, y] = dmyMatch;
          let d = parseInt(dStr, 10);
          let m = parseInt(mStr, 10);

          // V4.6 FIX: Handle MM-DD-YYYY format (or typos where Month > 12)
          // If Month is > 12 (e.g. 13), it's likely the Day, so swap properly.
          if (m > 12 && d <= 12) {
            console.warn(`[V4.6] Date ambiguous (Month ${m} > 12). Swapping D/M for "${dateStr}".`);
            const temp = d;
            d = m;
            m = temp;
          }

          // Ensure 4 digit year
          if (y.length === 2) y = `20${y}`;

          finalDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          console.log(`📅 [V4.6] Parsed: "${dateStr}" -> "${finalDate}"`);
        } else {
          // Fallback for ISO or other formats
          try {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
              // Use getFullYear/Month/Date to avoid timezone shift that toISOString() causes
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              finalDate = `${yyyy}-${mm}-${dd}`;
              console.log(`📅 [V4.2] Parsed (ISO Fallback): "${dateStr}" -> "${finalDate}"`);
            } else {
              continue;
            }
          } catch (e) {
            continue;
          }
        }

        // 2. Map Photographer
        const photographerName = String(photographerNameRaw || '').trim();
        let photographer = null;

        if (photographerName) {
          photographer = photographers.find(p =>
            p.name.toLowerCase() === photographerName.toLowerCase() ||
            p.name.toLowerCase().startsWith(photographerName.toLowerCase()) ||
            photographerName.toLowerCase().startsWith(p.name.toLowerCase())
          );
        }

        // 3. Create Delivery Record
        // FIX: Include photographer name to prevent collisions if multiple deliveries occur on the same day
        // FIX V2: Include row index to prevent collisions if SAME photographer has multiple records on same day
        const photographerSuffix = photographerName ? `_${photographerName.replace(/\s+/g, '_').toUpperCase()}` : '';
        const deliveryName = `${finalDate}_${dealership.name.replace(/\s+/g, '_').toUpperCase()}${photographerSuffix}_${index + 1}_IMPORT`;

        // Check for duplicate
        if (existingNames.has(deliveryName)) {
          skipCount++;
          continue;
        }

        await deliveriesDb.createDelivery({
          date: finalDate,
          showroom_code: defaultShowroom.dealershipId === dealership.id ?
            (dealership.name.match(/\(([^)]+)\)/)?.[1] || dealership.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, ''))
            : defaultShowroom.id,
          cluster_code: defaultShowroom.clusterId,
          showroom_type: 'PRIMARY',
          timing: null,
          delivery_name: deliveryName,
          status: 'DONE',
          assigned_user_id: photographer?.id || null,
          footage_link: footageLink || null,
          payment_type: dealership.paymentType,
          reel_link: reelLink || null
        } as any);

        importCount++;
      }

      const totalMsg = importCount > 0
        ? `Successfully imported ${importCount} records!`
        : `No new records to import.`;

      const skipMsg = skipCount > 0 ? ` (${skipCount} duplicates skipped)` : '';
      toast.success(`${totalMsg}${skipMsg} (Script: ${scriptVersion})`);
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        {dealerships.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No dealerships configured. Click "Add Dealership" to create one.
            </CardContent>
          </Card>
        ) : (
          dealerships.map(dealership => {
            const dealershipMappingCount = mappings.filter(
              m => m.dealershipId === dealership.id
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
                        <CardTitle>{dealership.name}</CardTitle>
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
                          </div>
                          {dealership.googleSheetId && (
                            <div className="flex items-center gap-1 text-xs text-blue-600 font-mono">
                              <span className="opacity-70 text-[10px] uppercase tracking-wider">Sync:</span>
                              <span className="truncate max-w-[200px]">{dealership.googleSheetId}</span>
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

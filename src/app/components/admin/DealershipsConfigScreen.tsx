import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useNavigate } from 'react-router-dom';
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
import { ArrowLeft, Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import type { Dealership, PaymentType } from '../../types';

export function DealershipsConfigScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dealerships, addDealership, updateDealership, deleteDealership, mappings } =
    useConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDealership, setEditingDealership] = useState<Dealership | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [dealershipToDelete, setDealershipToDelete] = useState<Dealership | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    paymentType: 'CUSTOMER_PAID' as PaymentType,
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
        latitude: dealership.latitude.toString(),
        longitude: dealership.longitude.toString(),
        paymentType: dealership.paymentType,
      });
    } else {
      setEditingDealership(null);
      setFormData({
        name: '',
        latitude: '',
        longitude: '',
        paymentType: 'CUSTOMER_PAID',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDealership(null);
    setFormData({
      name: '',
      latitude: '',
      longitude: '',
      paymentType: 'CUSTOMER_PAID',
    });
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Dealership name is required');
      return;
    }
    if (!formData.latitude || !formData.longitude) {
      toast.error('Latitude and longitude are required');
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Invalid coordinates');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Coordinates out of valid range');
      return;
    }

    if (editingDealership) {
      updateDealership(editingDealership.id, {
        name: formData.name.trim(),
        latitude: lat,
        longitude: lng,
        paymentType: formData.paymentType,
      });
      toast.success('Dealership updated successfully');
    } else {
      addDealership({
        name: formData.name.trim(),
        latitude: lat,
        longitude: lng,
        paymentType: formData.paymentType,
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

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
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

      {/* Dealerships List */}
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
                          <div>
                            📍 Lat: {dealership.latitude.toFixed(4)}, Lng:{' '}
                            {dealership.longitude.toFixed(4)}
                          </div>
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
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
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
                placeholder="e.g., Khatri Wheels (KHTR_WH)"
              />
            </div>

            <div>
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="0.0001"
                value={formData.latitude}
                onChange={e =>
                  setFormData({ ...formData, latitude: e.target.value })
                }
                placeholder="e.g., 28.7041"
              />
            </div>

            <div>
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="0.0001"
                value={formData.longitude}
                onChange={e =>
                  setFormData({ ...formData, longitude: e.target.value })
                }
                placeholder="e.g., 77.1025"
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

      {/* Delete Confirmation Dialog */}
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
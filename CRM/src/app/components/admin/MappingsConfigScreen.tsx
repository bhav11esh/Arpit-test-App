import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
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
import { ArrowLeft, Plus, Edit, Trash2, Network } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import type { Mapping, MappingType } from '../../types';

/**
 * MappingsConfigScreen - V1 DECLARATIVE SETUP ONLY
 * 
 * ⚠️ CRITICAL: Mappings are DECLARATIVE, NOT DYNAMIC
 * 
 * 🔒 BOUNDARY ENFORCEMENT:
 * - Mappings define cluster ↔ dealership relationships (showroom locations) for FUTURE deliveries
 * - Each mapping represents ONE SHOWROOM LOCATION (dealership in a specific cluster)
 * - A single dealership can have MULTIPLE mappings across different clusters
 * - PRIMARY mapping = Main showroom for this dealership-cluster pair (requires photographer)
 * - SECONDARY mapping = Satellite showroom for this dealership-cluster pair (accept/reject only)
 * - Mappings do NOT reassign existing deliveries when changed
 * - Changing a mapping does NOT:
 *   ❌ Reassign deliveries already created
 *   ❌ Modify delivery.showroom_type retroactively
 *   ❌ Recalculate incentives
 *   ❌ Update reel backlog assignments
 * 
 * This is environment setup, not operational reassignment.
 */

export function MappingsConfigScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    mappings,
    addMapping,
    updateMapping,
    deleteMapping,
    clusters,
    dealerships,
    photographers,
  } = useConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<Mapping | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [mappingToDelete, setMappingToDelete] = useState<Mapping | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    clusterId: '',
    dealershipId: '',
    photographerId: '',
    mappingType: 'PRIMARY' as MappingType,
    latitude: '',
    longitude: '',
  });

  // Admin-only access guard (Defensive: AppRoutes handles primary auth redirect)
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center text-gray-500">
        Authenticating admin session...
      </div>
    );
  }

  const handleOpenDialog = (mapping?: Mapping) => {
    if (mapping) {
      setEditingMapping(mapping);
      setFormData({
        clusterId: mapping.clusterId,
        dealershipId: mapping.dealershipId,
        photographerId: mapping.photographerId,
        mappingType: mapping.mappingType,
        latitude: mapping.latitude.toString(),
        longitude: mapping.longitude.toString(),
      });
    } else {
      setEditingMapping(null);
      setFormData({
        clusterId: '',
        dealershipId: '',
        photographerId: '',
        mappingType: 'PRIMARY',
        latitude: '',
        longitude: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMapping(null);
    setFormData({
      clusterId: '',
      dealershipId: '',
      photographerId: '',
      mappingType: 'PRIMARY',
      latitude: '',
      longitude: '',
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.clusterId) {
      toast.error('Please select a cluster');
      return;
    }
    if (!formData.dealershipId) {
      toast.error('Please select a dealership');
      return;
    }

    // Coordinates validation
    if (!formData.latitude || !formData.longitude) {
      toast.error('Latitude and longitude are required for geofencing');
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Invalid coordinates');
      return;
    }

    // V1 BUSINESS RULE: PRIMARY showrooms REQUIRE photographer, SECONDARY showrooms NEVER have one
    if (formData.mappingType === 'PRIMARY' && !formData.photographerId) {
      toast.error('PRIMARY showrooms require a photographer assignment');
      return;
    }

    // Check for duplicate mapping (same cluster + dealership combination)
    const existingMapping = mappings.find(
      m =>
        m.clusterId === formData.clusterId &&
        m.dealershipId === formData.dealershipId &&
        (!editingMapping || m.id !== editingMapping.id)
    );

    if (existingMapping) {
      toast.error(
        'A mapping already exists for this cluster-dealership combination. Edit or delete it first.'
      );
      return;
    }

    // V1 ENFORCEMENT: SECONDARY showrooms NEVER have photographers assigned
    const photographerIdToSave = formData.mappingType === 'SECONDARY'
      ? null
      : formData.photographerId;

    // V1 ENFORCEMENT: One photographer can only have ONE primary showroom
    if (formData.mappingType === 'PRIMARY' && photographerIdToSave) {
      const existingPrimaryMapping = mappings.find(
        m =>
          m.photographerId === photographerIdToSave &&
          m.mappingType === 'PRIMARY' &&
          m.id !== editingMapping?.id // Exclude current mapping when editing
      );

      if (existingPrimaryMapping) {
        const existingDealershipName = getDealershipName(existingPrimaryMapping.dealershipId);
        const existingClusterName = getClusterName(existingPrimaryMapping.clusterId);
        toast.error(
          `This photographer already has a PRIMARY showroom: ${existingDealershipName} (${existingClusterName}). A photographer can only have ONE primary showroom.`
        );
        return;
      }
    }

    // Validate photographer is active (only for PRIMARY showrooms)
    if (photographerIdToSave) {
      const photographer = photographers.find(p => p.id === photographerIdToSave);
      if (photographer && !photographer.active) {
        toast.warning('Selected photographer is inactive');
      }
    }

    setSubmitting(true);
    try {
      if (editingMapping) {
        await updateMapping(editingMapping.id, {
          clusterId: formData.clusterId,
          dealershipId: formData.dealershipId,
          photographerId: photographerIdToSave,
          mappingType: formData.mappingType,
          latitude: lat,
          longitude: lng,
        });
        toast.success('Mapping updated successfully');
      } else {
        await addMapping({
          clusterId: formData.clusterId,
          dealershipId: formData.dealershipId,
          photographerId: photographerIdToSave,
          mappingType: formData.mappingType,
          latitude: lat,
          longitude: lng,
        });
        toast.success('Mapping added successfully');
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save mapping:', error);
      toast.error('Failed to save mapping. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (mapping: Mapping) => {
    setMappingToDelete(mapping);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (mappingToDelete) {
      deleteMapping(mappingToDelete.id);
      toast.success('Mapping deleted successfully');
      setDeleteConfirmOpen(false);
      setMappingToDelete(null);
    }
  };

  const getClusterName = (id: string) =>
    clusters.find(c => c.id === id)?.name || 'Unknown Cluster';
  const getDealershipName = (id: string) =>
    dealerships.find(d => d.id === id)?.name || 'Unknown Dealership';
  const getPhotographerName = (id: string) =>
    photographers.find(p => p.id === id)?.name || 'Unknown Photographer';
  const getPhotographerActive = (id: string) =>
    photographers.find(p => p.id === id)?.active ?? false;

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
            <h1 className="text-2xl font-bold">Showroom Mappings</h1>
            <p className="text-sm text-gray-600">
              Define dealership showroom locations (geofenced) across clusters
            </p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Showroom
        </Button>
      </div>

      {/* Warning if no entities exist */}
      {(clusters.length === 0 || dealerships.length === 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="text-orange-600 text-xl">⚠️</div>
              <div className="text-sm text-orange-800">
                <p className="font-semibold mb-1">Missing Configuration</p>
                <p>
                  You need at least one cluster and dealership to create mappings.
                  {photographers.length === 0 && ' Photographers are optional for SECONDARY mappings but required for PRIMARY mappings.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mappings List */}
      <div className="grid gap-4">
        {mappings.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No mappings configured. Click "Add Showroom" to create one.
            </CardContent>
          </Card>
        ) : (
          mappings.map(mapping => {
            const isPhotographerActive = mapping.photographerId
              ? getPhotographerActive(mapping.photographerId)
              : true; // No photographer assigned = no active check needed

            return (
              <Card key={mapping.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Network className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            className={
                              mapping.mappingType === 'PRIMARY'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }
                          >
                            {mapping.mappingType}
                          </Badge>
                          {mapping.photographerId && !isPhotographerActive && (
                            <Badge className="bg-red-100 text-red-800">
                              Photographer Inactive
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Cluster:</span>
                            <span className="font-medium">
                              {getClusterName(mapping.clusterId)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Dealership:</span>
                            <span className="font-medium">
                              {getDealershipName(mapping.dealershipId)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">📍 Geo:</span>
                            <span className="font-medium">
                              {(mapping.latitude || 0).toFixed(4)}, {(mapping.longitude || 0).toFixed(4)}
                            </span>
                          </div>
                          {mapping.mappingType === 'PRIMARY' && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">Photographer:</span>
                              <span className="font-medium">
                                {mapping.photographerId
                                  ? getPhotographerName(mapping.photographerId)
                                  : 'Not Assigned'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(mapping)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(mapping)}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMapping ? 'Edit Showroom Location' : 'Add Showroom Location'}
            </DialogTitle>
            <DialogDescription>
              A mapping represents a physical showroom location (latitude/longitude)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="cluster">Cluster (Showroom Location)</Label>
              <Select
                value={formData.clusterId}
                onValueChange={value =>
                  setFormData({ ...formData, clusterId: value })
                }
              >
                <SelectTrigger id="cluster">
                  <SelectValue placeholder="Select cluster" />
                </SelectTrigger>
                <SelectContent>
                  {clusters.map(cluster => (
                    <SelectItem key={cluster.id} value={cluster.id}>
                      {cluster.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dealership">Dealership</Label>
              <Select
                value={formData.dealershipId}
                onValueChange={value =>
                  setFormData({ ...formData, dealershipId: value })
                }
              >
                <SelectTrigger id="dealership">
                  <SelectValue placeholder="Select dealership" />
                </SelectTrigger>
                <SelectContent>
                  {dealerships.map(dealership => (
                    <SelectItem key={dealership.id} value={dealership.id}>
                      {dealership.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="28.7041"
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="77.1025"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="mappingType">Showroom Type</Label>
              <Select
                value={formData.mappingType}
                onValueChange={(value: MappingType) => {
                  // V1 BUSINESS RULE: SECONDARY showrooms NEVER have photographers
                  // Clear photographer when switching to SECONDARY
                  if (value === 'SECONDARY') {
                    setFormData({ ...formData, mappingType: value, photographerId: '' });
                  } else {
                    setFormData({ ...formData, mappingType: value });
                  }
                }}
              >
                <SelectTrigger id="mappingType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIMARY">
                    PRIMARY - Main showroom (requires photographer)
                  </SelectItem>
                  <SelectItem value="SECONDARY">
                    SECONDARY - Satellite showroom (no photographer)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* V1 RULE: Photographer field ONLY shown for PRIMARY mappings */}
            {formData.mappingType === 'PRIMARY' && (
              <div>
                <Label htmlFor="photographer">
                  Photographer <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={formData.photographerId}
                  onValueChange={value =>
                    setFormData({ ...formData, photographerId: value })
                  }
                >
                  <SelectTrigger id="photographer">
                    <SelectValue placeholder="Select photographer" />
                  </SelectTrigger>
                  <SelectContent>
                    {photographers.map(photographer => (
                      <SelectItem key={photographer.id} value={photographer.id}>
                        {photographer.name}
                        {!photographer.active && ' (Inactive)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Plus className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>{editingMapping ? 'Update' : 'Add'} Showroom</>
              )}
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
              Are you sure you want to delete this mapping? This action cannot be
              undone.
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

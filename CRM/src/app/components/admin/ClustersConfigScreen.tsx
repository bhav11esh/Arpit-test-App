import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import type { Cluster } from '../../types';

export function ClustersConfigScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { clusters, addCluster, updateCluster, deleteCluster, mappings } = useConfig();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clusterToDelete, setClusterToDelete] = useState<Cluster | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
  });

  // Admin-only access guard
  if (user?.role !== 'ADMIN') {
    toast.error('Access denied. Admin privileges required.');
    navigate('/');
    return null;
  }

  const handleOpenDialog = (cluster?: Cluster) => {
    if (cluster) {
      setEditingCluster(cluster);
      setFormData({
        name: cluster.name,
        latitude: cluster.latitude.toString(),
        longitude: cluster.longitude.toString(),
      });
    } else {
      setEditingCluster(null);
      setFormData({ name: '', latitude: '', longitude: '' });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCluster(null);
    setFormData({ name: '', latitude: '', longitude: '' });
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Cluster name is required');
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

    if (editingCluster) {
      updateCluster(editingCluster.id, {
        name: formData.name.trim(),
        latitude: lat,
        longitude: lng,
      });
      toast.success('Cluster updated successfully');
    } else {
      addCluster({
        name: formData.name.trim(),
        latitude: lat,
        longitude: lng,
      });
      toast.success('Cluster added successfully');
    }

    handleCloseDialog();
  };

  const handleDeleteClick = (cluster: Cluster) => {
    // Check if cluster has mappings
    const clusterMappings = mappings.filter(m => m.clusterId === cluster.id);
    if (clusterMappings.length > 0) {
      toast.error(
        `Cannot delete cluster. ${clusterMappings.length} mapping(s) depend on it. Delete those first.`
      );
      return;
    }
    setClusterToDelete(cluster);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (clusterToDelete) {
      deleteCluster(clusterToDelete.id);
      toast.success('Cluster deleted successfully');
      setDeleteConfirmOpen(false);
      setClusterToDelete(null);
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
            <h1 className="text-2xl font-bold">Clusters</h1>
            <p className="text-sm text-gray-600">
              Manage geographic clusters
            </p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Cluster
        </Button>
      </div>

      {/* Clusters List */}
      <div className="grid gap-4">
        {clusters.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No clusters configured. Click "Add Cluster" to create one.
            </CardContent>
          </Card>
        ) : (
          clusters.map(cluster => {
            const clusterMappingCount = mappings.filter(
              m => m.clusterId === cluster.id
            ).length;

            return (
              <Card key={cluster.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <MapPin className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle>{cluster.name}</CardTitle>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          <div>
                            📍 Lat: {cluster.latitude.toFixed(4)}, Lng:{' '}
                            {cluster.longitude.toFixed(4)}
                          </div>
                          <div className="text-blue-600">
                            {clusterMappingCount} mapping(s) configured
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(cluster)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(cluster)}
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
              {editingCluster ? 'Edit Cluster' : 'Add New Cluster'}
            </DialogTitle>
            <DialogDescription>
              Configure cluster name and geographic coordinates
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Cluster Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., North Delhi"
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingCluster ? 'Update' : 'Add'} Cluster
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
              Are you sure you want to delete cluster "{clusterToDelete?.name}"?
              This action cannot be undone.
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
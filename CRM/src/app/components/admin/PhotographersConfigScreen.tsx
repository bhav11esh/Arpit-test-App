import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2, User, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import type { User as UserType } from '../../types';

export function PhotographersConfigScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    photographers,
    addPhotographer,
    updatePhotographer,
    deletePhotographer,
    mappings,
  } = useConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPhotographer, setEditingPhotographer] = useState<UserType | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [photographerToDelete, setPhotographerToDelete] = useState<UserType | null>(
    null
  );

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    active: true,
  });

  // Admin-only access guard
  if (user?.role !== 'ADMIN') {
    toast.error('Access denied. Admin privileges required.');
    navigate('/');
    return null;
  }

  const handleOpenDialog = (photographer?: UserType) => {
    if (photographer) {
      setEditingPhotographer(photographer);
      setFormData({
        name: photographer.name,
        active: photographer.active,
      });
    } else {
      setEditingPhotographer(null);
      setFormData({ name: '', active: true });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPhotographer(null);
    setFormData({ name: '', active: true });
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Photographer name is required');
      return;
    }

    if (editingPhotographer) {
      updatePhotographer(editingPhotographer.id, {
        name: formData.name.trim(),
        active: formData.active,
      });
      toast.success('Photographer updated successfully');
    } else {
      addPhotographer({
        name: formData.name.trim(),
        active: formData.active,
      });
      toast.success('Photographer added successfully');
    }

    handleCloseDialog();
  };

  const handleDeleteClick = (photographer: UserType) => {
    // Check if photographer has mappings
    const photographerMappings = mappings.filter(
      m => m.photographerId === photographer.id
    );
    if (photographerMappings.length > 0) {
      toast.error(
        `Cannot delete photographer. ${photographerMappings.length} mapping(s) depend on them. Delete those first.`
      );
      return;
    }
    setPhotographerToDelete(photographer);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (photographerToDelete) {
      deletePhotographer(photographerToDelete.id);
      toast.success('Photographer deleted successfully');
      setDeleteConfirmOpen(false);
      setPhotographerToDelete(null);
    }
  };

  const handleToggleActive = (photographer: UserType) => {
    updatePhotographer(photographer.id, { active: !photographer.active });
    toast.success(
      photographer.active
        ? 'Photographer deactivated'
        : 'Photographer activated'
    );
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
            <h1 className="text-2xl font-bold">Photographers</h1>
            <p className="text-sm text-gray-600">
              Manage photographer profiles and status
            </p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Photographer
        </Button>
      </div>

      {/* Photographers List */}
      <div className="grid gap-4">
        {photographers.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No photographers configured. Click "Add Photographer" to create one.
            </CardContent>
          </Card>
        ) : (
          photographers.map(photographer => {
            const photographerMappingCount = mappings.filter(
              m => m.photographerId === photographer.id
            ).length;
            const primaryMappings = mappings.filter(
              m =>
                m.photographerId === photographer.id && m.mappingType === 'PRIMARY'
            ).length;
            const secondaryMappings = mappings.filter(
              m =>
                m.photographerId === photographer.id &&
                m.mappingType === 'SECONDARY'
            ).length;

            return (
              <Card key={photographer.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          photographer.active
                            ? 'bg-purple-100'
                            : 'bg-gray-100'
                        }`}
                      >
                        {photographer.active ? (
                          <UserCheck className="h-5 w-5 text-purple-600" />
                        ) : (
                          <UserX className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle>{photographer.name}</CardTitle>
                          <Badge
                            className={
                              photographer.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                            }
                          >
                            {photographer.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          <div>
                            ID: <span className="font-mono">{photographer.id}</span>
                          </div>
                          <div className="text-purple-600">
                            {photographerMappingCount} mapping(s): {primaryMappings}{' '}
                            primary, {secondaryMappings} secondary
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(photographer)}
                        title={
                          photographer.active ? 'Deactivate' : 'Activate'
                        }
                      >
                        {photographer.active ? (
                          <UserX className="h-4 w-4 text-orange-600" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(photographer)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(photographer)}
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
              {editingPhotographer
                ? 'Edit Photographer'
                : 'Add New Photographer'}
            </DialogTitle>
            <DialogDescription>
              Configure photographer profile and active status
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Photographer Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Rahul Sharma"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="active">Active Status</Label>
                <p className="text-sm text-gray-600">
                  Inactive photographers cannot be assigned deliveries
                </p>
              </div>
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={checked =>
                  setFormData({ ...formData, active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingPhotographer ? 'Update' : 'Add'} Photographer
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
              Are you sure you want to delete photographer "
              {photographerToDelete?.name}"? This action cannot be undone.
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
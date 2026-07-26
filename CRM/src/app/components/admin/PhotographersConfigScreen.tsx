import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import * as screenshotsDb from '../../lib/db/screenshots';
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
import { ArrowLeft, Plus, Edit, Trash2, User, UserCheck, UserX, Film } from 'lucide-react';
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
    updatePhotographerPassword,
    deletePhotographer,
    mappings,
  } = useConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editingPhotographer, setEditingPhotographer] = useState<UserType | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<UserType | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [photographerToDelete, setPhotographerToDelete] = useState<UserType | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone_number: string;
    secondary_phone_number: string;
    password: string;
    active: boolean;
    city: string;
    payout_model: 'PERCENTAGE' | 'FIXED' | 'PERCENTAGE_15_DAILY';
    fixed_start_date: string;
    fixed_end_date: string;
    profile_image_file: File | null;
    profile_image_url: string;
  }>({
    name: '',
    email: '',
    phone_number: '',
    secondary_phone_number: '',
    password: '',
    active: true,
    city: '',
    payout_model: 'PERCENTAGE_15_DAILY',
    fixed_start_date: '',
    fixed_end_date: '',
    profile_image_file: null,
    profile_image_url: '',
  });

  // Admin-only access guard
  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    toast.error('Access denied. Admin privileges required.');
    navigate('/');
    return null;
  }

  // Filter photographers by city
  const filteredPhotographers = user?.city 
    ? photographers.filter(p => (p as any).city === user.city)
    : photographers;

  const handleDownloadPhoto = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success('Image download started');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download image');
    }
  };

  const handleOpenDialog = (photographer?: UserType) => {
    if (photographer) {
      setEditingPhotographer(photographer);
      setFormData({
        name: photographer.name,
        email: photographer.email,
        phone_number: photographer.phone_number || '',
        secondary_phone_number: photographer.secondary_phone_number || '',
        password: '', // Password is only for new photographers
        active: photographer.active,
        city: (photographer as any).city || '',
        payout_model: (photographer as any).payout_model || 'PERCENTAGE_15_DAILY',
        fixed_start_date: (photographer as any).fixed_start_date || '',
        fixed_end_date: (photographer as any).fixed_end_date || '',
        profile_image_file: null,
        profile_image_url: (photographer as any).profile_image_url || '',
      });
    } else {
      setEditingPhotographer(null);
      setFormData({ 
        name: '', 
        email: '', 
        phone_number: '', 
        secondary_phone_number: '', 
        password: '', 
        active: true,
        city: user?.city || '',
        payout_model: 'PERCENTAGE_15_DAILY',
        fixed_start_date: '',
        fixed_end_date: '',
        profile_image_file: null,
        profile_image_url: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPhotographer(null);
    setFormData({ 
      name: '', 
      email: '', 
      phone_number: '', 
      secondary_phone_number: '', 
      password: '', 
      active: true, 
      city: '',
      payout_model: 'PERCENTAGE_15_DAILY',
      fixed_start_date: '',
      fixed_end_date: '',
      profile_image_file: null,
      profile_image_url: '',
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Photographer name is required');
      return;
    }
    if (!editingPhotographer && !formData.password.trim()) {
      toast.error('Password is required for new photographers');
      return;
    }

    if (!editingPhotographer && formData.password.trim().length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!formData.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!formData.city.trim()) {
      toast.error('City is required');
      return;
    }

    // Active photographer validation: Phone number, secondary phone number, and profile image are mandatory
    if (formData.active) {
      if (!formData.phone_number.trim()) {
        toast.error('Primary phone number is mandatory for active photographers');
        return;
      }
      if (!formData.secondary_phone_number.trim()) {
        toast.error('Secondary phone number is mandatory for active photographers');
        return;
      }
      if (!editingPhotographer && !formData.profile_image_file) {
        toast.error('Profile image is mandatory for active photographers');
        return;
      }
      if (editingPhotographer && !formData.profile_image_file && !formData.profile_image_url) {
        toast.error('Profile image is mandatory for active photographers');
        return;
      }
    }

    setSubmitting(true);
    try {
      let profileImageUrl = formData.profile_image_url;
      if (formData.profile_image_file) {
        const path = `avatars/${Date.now()}_${formData.profile_image_file.name}`;
        profileImageUrl = await screenshotsDb.uploadScreenshotFile(formData.profile_image_file, path, supabase);
      }

      if (editingPhotographer) {
        await updatePhotographer(editingPhotographer.id, {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone_number: formData.phone_number.trim() || null,
          secondary_phone_number: formData.secondary_phone_number.trim() || null,
          active: formData.active,
          city: formData.city.toLowerCase().trim(),
          payout_model: formData.payout_model,
          fixed_start_date: formData.fixed_start_date || null,
          fixed_end_date: formData.payout_model !== 'FIXED' && formData.fixed_start_date ? (formData.fixed_end_date || null) : null,
          profile_image_url: profileImageUrl || null,
        } as any);
        toast.success('Photographer updated successfully');
      } else {
        await addPhotographer({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone_number: formData.phone_number.trim() || null,
          secondary_phone_number: formData.secondary_phone_number.trim() || null,
          password: formData.password.trim(),
          active: formData.active,
          city: formData.city.toLowerCase().trim(),
          payout_model: formData.payout_model,
          fixed_start_date: formData.fixed_start_date || null,
          fixed_end_date: formData.payout_model !== 'FIXED' && formData.fixed_start_date ? (formData.fixed_end_date || null) : null,
          profile_image_url: profileImageUrl || null,
        } as any);
        toast.success('Photographer added successfully');
      }
      handleCloseDialog();
    } catch (error: any) {
      console.error('Failed to save photographer:', error);
      const errorMessage = error?.message || 'Failed to save photographer. Please check your connection.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
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

  const handleUpdatePassword = async () => {
    if (!passwordTarget) return;
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      await updatePhotographerPassword(passwordTarget.id, newPassword);
      toast.success('Password updated successfully');
      setPasswordDialogOpen(false);
      setNewPassword('');
    } catch (error: any) {
      console.error('Failed to update password:', error);
      toast.error(error?.message || 'Failed to update password. Admin Service Key may be required.');
    } finally {
      setSubmitting(false);
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
        {filteredPhotographers.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No photographers configured. Click "Add Photographer" to create one.
            </CardContent>
          </Card>
        ) : (
          filteredPhotographers.map(photographer => {
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
                        className={`h-10 w-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${photographer.active
                          ? 'bg-purple-100'
                          : 'bg-gray-100'
                          }`}
                      >
                        {photographer.profile_image_url ? (
                          <img src={photographer.profile_image_url} alt={photographer.name} className="h-full w-full object-cover" />
                        ) : photographer.active ? (
                          <UserCheck className="h-5 w-5 text-purple-600" />
                        ) : (
                          <UserX className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle>{photographer.name}</CardTitle>
                          {(photographer as any).city && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">
                              {(photographer as any).city}
                            </Badge>
                          )}
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
                          {photographer.phone_number && (
                            <div>
                              Phone: <span className="font-mono text-gray-700">{photographer.phone_number}</span>
                            </div>
                          )}
                          {photographer.secondary_phone_number && (
                            <div>
                              Sec. Phone: <span className="font-mono text-gray-700">{photographer.secondary_phone_number}</span>
                            </div>
                          )}
                          <div className="text-purple-600 font-medium">
                            {photographerMappingCount} mapping(s): {primaryMappings}{' '}
                            primary, {secondaryMappings} secondary
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Payout Model: <span className="font-semibold text-blue-600">
                              {photographer.payout_model === 'PERCENTAGE_15_DAILY'
                                ? 'Flat 15% Daily Settlement'
                                : photographer.payout_model === 'FIXED'
                                  ? 'Fixed Salary'
                                  : 'Percentage Based (10/30/50) [Legacy]'}
                            </span>
                            {photographer.fixed_start_date && (
                              <span className="text-gray-500 ml-1.5 font-mono">
                                (Fixed: {photographer.fixed_start_date}
                                {photographer.fixed_end_date ? ` to ${photographer.fixed_end_date}` : ''})
                              </span>
                            )}
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
                        onClick={() => {
                          setPasswordTarget(photographer);
                          setPasswordDialogOpen(true);
                        }}
                        title="Set Password"
                      >
                        <Film className="h-4 w-4 text-blue-600" />
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
              <Label>Profile Image {formData.active && <span className="text-red-500">*</span>}</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="h-16 w-16 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                  {formData.profile_image_file ? (
                    <img src={URL.createObjectURL(formData.profile_image_file)} alt="Preview" className="h-full w-full object-cover" />
                  ) : formData.profile_image_url ? (
                    <img src={formData.profile_image_url} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Input
                      id="profile_image"
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          setFormData(prev => ({ ...prev, profile_image_file: file }));
                        }
                      }}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('profile_image')?.click()}
                    >
                      Choose Image
                    </Button>
                    {editingPhotographer && formData.profile_image_url && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownloadPhoto(formData.profile_image_url, `${formData.name.replace(/\s+/g, '_')}_profile.jpg`)}
                      >
                        Download Photo
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500">
                    JPEG, PNG, WebP format. Max 10MB.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="name">Photographer Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Rahul Sharma"
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., rahul@example.com"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number {formData.active && <span className="text-red-500">*</span>}</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone_number}
                onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="e.g., +91 9876543210"
              />
            </div>

            <div>
              <Label htmlFor="secondary_phone">Secondary Phone Number {formData.active && <span className="text-red-500">*</span>}</Label>
              <Input
                id="secondary_phone"
                type="tel"
                value={formData.secondary_phone_number}
                onChange={e => setFormData({ ...formData, secondary_phone_number: e.target.value })}
                placeholder="e.g., +91 9876543211"
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g., bengaluru"
              />
            </div>

            <div>
              <Label htmlFor="payout_model">Payout Model</Label>
              <select
                id="payout_model"
                value={formData.payout_model}
                onChange={e => setFormData({ ...formData, payout_model: e.target.value as 'PERCENTAGE' | 'FIXED' | 'PERCENTAGE_15_DAILY' })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {formData.payout_model === 'PERCENTAGE' && (
                  <option value="PERCENTAGE">Percentage Based (10/30/50) [Legacy]</option>
                )}
                <option value="PERCENTAGE_15_DAILY">Flat 15% Daily Settlement</option>
                <option value="FIXED">Fixed Salary (per Working Day)</option>
              </select>
            </div>

            {formData.payout_model === 'FIXED' && (
              <div>
                <Label htmlFor="fixed_start_date">Fixed Payout Start Date</Label>
                <Input
                  id="fixed_start_date"
                  type="date"
                  value={formData.fixed_start_date}
                  onChange={e => setFormData({ ...formData, fixed_start_date: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  The date this photographer switched to Fixed Payout.
                </p>
              </div>
            )}

            {formData.payout_model !== 'FIXED' && formData.fixed_start_date && (
              <div>
                <Label htmlFor="fixed_end_date">Fixed Payout End Date (Switch back from Fixed)</Label>
                <Input
                  id="fixed_end_date"
                  type="date"
                  value={formData.fixed_end_date}
                  onChange={e => setFormData({ ...formData, fixed_end_date: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  The date they switched back from Fixed to their current model.
                </p>
              </div>
            )}

            {!editingPhotographer && (
              <div>
                <Label htmlFor="password">Initial Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 6 characters"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The photographer will use this to sign in for the first time.
                </p>
              </div>
            )}

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
                <>{editingPhotographer ? 'Update' : 'Add'} Photographer</>
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
      {/* Update Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Password</DialogTitle>
            <DialogDescription>
              Set a new password for {passwordTarget?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordDialogOpen(false);
                setNewPassword('');
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdatePassword} disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

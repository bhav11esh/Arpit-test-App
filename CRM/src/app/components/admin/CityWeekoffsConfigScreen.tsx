import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { getCityWeekoffs, upsertCityWeekoff, deleteCityWeekoff } from '../../lib/db/leaves';
import type { CityWeekoff } from '../../types';

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function CityWeekoffsConfigScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<CityWeekoff[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CityWeekoff | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<CityWeekoff | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    city: '',
    weekoffDayIndex: 2, // Default to Tuesday
  });

  // Admin-only access guard
  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    toast.error('Access denied. Admin privileges required.');
    navigate('/');
    return null;
  }

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await getCityWeekoffs();
      setConfigs(data);
    } catch (err) {
      console.error('Failed to load city week-offs:', err);
      toast.error('Failed to load city week-offs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (config?: CityWeekoff) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        city: config.city,
        weekoffDayIndex: config.weekoff_day_index,
      });
    } else {
      setEditingConfig(null);
      setFormData({
        city: '',
        weekoffDayIndex: 2, // default Tuesday
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingConfig(null);
    setFormData({ city: '', weekoffDayIndex: 2 });
  };

  const handleSubmit = async () => {
    if (!formData.city.trim()) {
      toast.error('City name is required');
      return;
    }

    const cityLower = formData.city.trim().toLowerCase();

    try {
      await upsertCityWeekoff(cityLower, formData.weekoffDayIndex);
      toast.success(
        editingConfig
          ? 'Week-off configuration updated'
          : 'Week-off configuration added'
      );
      handleCloseDialog();
      loadConfigs();
    } catch (err) {
      console.error('Failed to save config:', err);
      toast.error('Failed to save config');
    }
  };

  const handleDeleteClick = (config: CityWeekoff) => {
    setConfigToDelete(config);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (configToDelete) {
      try {
        await deleteCityWeekoff(configToDelete.city);
        toast.success('Week-off configuration deleted successfully');
        setDeleteConfirmOpen(false);
        setConfigToDelete(null);
        loadConfigs();
      } catch (err) {
        console.error('Failed to delete config:', err);
        toast.error('Failed to delete config');
      }
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
            <h1 className="text-2xl font-bold">City Week-offs</h1>
            <p className="text-sm text-gray-600">
              Configure city-level default week-off days (Defaults to Tuesday if not configured)
            </p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Configuration
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50/50 border-blue-100">
        <CardContent className="pt-6 text-sm text-blue-900">
          💡 By default, any photographer's week-off day is <strong>Tuesday</strong>.
          You only need to add configurations here for cities that use a day other than Tuesday,
          or to explicitly declare Tuesday for visibility.
        </CardContent>
      </Card>

      {/* Configurations List */}
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              Loading configurations...
            </CardContent>
          </Card>
        ) : configs.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No custom city week-offs configured. All cities default to Tuesday.
            </CardContent>
          </Card>
        ) : (
          configs.map((config) => (
            <Card key={config.city}>
              <CardHeader className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="capitalize text-lg">{config.city}</CardTitle>
                        <Badge
                          variant="outline"
                          className="bg-purple-50 text-purple-700 border-purple-100"
                        >
                          Week-off: {DAYS_OF_WEEK[config.weekoff_day_index]}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        DOW Index: {config.weekoff_day_index}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(config)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(config)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Edit Week-off' : 'Add City Week-off'}
            </DialogTitle>
            <DialogDescription>
              Configure default week-off day index for a specific city.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="city">City Name</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="e.g., bengaluru"
                disabled={editingConfig !== null}
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Will be automatically converted to lowercase.
              </p>
            </div>
            <div>
              <Label htmlFor="weekoffDay">Week-off Day</Label>
              <select
                id="weekoffDay"
                className="w-full px-3 py-2 border rounded-lg mt-1"
                value={formData.weekoffDayIndex}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    weekoffDayIndex: parseInt(e.target.value),
                  })
                }
              >
                {DAYS_OF_WEEK.map((day, idx) => (
                  <option key={idx} value={idx}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingConfig ? 'Update' : 'Add'} Configuration
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
              Are you sure you want to delete the week-off configuration for "
              {configToDelete?.city}"? The city will revert to the default week-off of
              Tuesday.
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

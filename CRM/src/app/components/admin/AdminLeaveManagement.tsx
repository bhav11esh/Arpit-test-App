import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLeave } from '../../context/LeaveContext';
import { useConfig } from '../../context/ConfigContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
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
import { ArrowLeft, Plus, Calendar, Clock, Trash2, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import type { LeaveHalf } from '../../types';
import { format } from 'date-fns';

type ViewMode = 'ALL' | 'BY_PHOTOGRAPHER' | 'BY_DATE';

export function AdminLeaveManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { leaves, addLeave, removeLeave } = useLeave();
  const { photographers } = useConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaveToDelete, setLeaveToDelete] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('ALL');
  const [filterPhotographerId, setFilterPhotographerId] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Form state
  const [formPhotographerId, setFormPhotographerId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formHalf, setFormHalf] = useState<LeaveHalf>('FIRST_HALF');

  // Admin-only access guard
  if (user?.role !== 'ADMIN') {
    toast.error('Access denied. Admin privileges required.');
    navigate('/');
    return null;
  }

  const handleOpenDialog = () => {
    setFormPhotographerId('');
    setFormDate('');
    setFormHalf('FIRST_HALF');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleAddLeave = () => {
    if (!formPhotographerId) {
      toast.error('Please select a photographer');
      return;
    }
    if (!formDate) {
      toast.error('Please select a date');
      return;
    }

    try {
      addLeave(formPhotographerId, formDate, formHalf, 'ADMIN');
      toast.success('Leave added successfully');
      handleCloseDialog();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to add leave');
      }
    }
  };

  const handleDeleteClick = (leaveId: string) => {
    setLeaveToDelete(leaveId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (leaveToDelete) {
      removeLeave(leaveToDelete);
      toast.success('Leave removed successfully');
      setDeleteDialogOpen(false);
      setLeaveToDelete(null);
    }
  };

  const getPhotographerName = (id: string) => {
    return photographers.find(p => p.id === id)?.name || 'Unknown Photographer';
  };

  const formatLeaveDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatLeaveHalf = (half: LeaveHalf) => {
    return half === 'FIRST_HALF' ? 'First Half' : 'Second Half';
  };

  // Filter leaves based on view mode
  const filteredLeaves = leaves.filter(leave => {
    if (viewMode === 'BY_PHOTOGRAPHER' && filterPhotographerId) {
      return leave.photographerId === filterPhotographerId;
    }
    if (viewMode === 'BY_DATE' && filterDate) {
      return leave.date === filterDate;
    }
    return true;
  }).sort((a, b) => {
    // Sort by date DESC, photographer, then half
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    if (a.photographerId !== b.photographerId) {
      return a.photographerId.localeCompare(b.photographerId);
    }
    return a.half === 'FIRST_HALF' ? -1 : 1;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Leave Management</h1>
            <p className="text-sm text-gray-600">
              Manage photographer leaves (half-day basis)
            </p>
          </div>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Leave
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Label>View:</Label>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewMode('ALL');
                  setFilterPhotographerId('');
                  setFilterDate('');
                }}
              >
                All Leaves
              </Button>
              <Button
                variant={viewMode === 'BY_PHOTOGRAPHER' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('BY_PHOTOGRAPHER')}
              >
                By Photographer
              </Button>
              <Button
                variant={viewMode === 'BY_DATE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('BY_DATE')}
              >
                By Date
              </Button>
            </div>

            {viewMode === 'BY_PHOTOGRAPHER' && (
              <Select value={filterPhotographerId} onValueChange={setFilterPhotographerId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select photographer" />
                </SelectTrigger>
                <SelectContent>
                  {photographers.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {viewMode === 'BY_DATE' && (
              <input
                type="date"
                className="px-3 py-2 border rounded-lg"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leaves List */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Leaves ({filteredLeaves.length})
        </h2>
        {filteredLeaves.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              {viewMode === 'ALL' ? 'No leaves found' : 'No leaves for selected filter'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredLeaves.map((leave) => (
              <Card key={leave.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {getPhotographerName(leave.photographerId)}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {formatLeaveDate(leave.date)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {formatLeaveHalf(leave.half)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Applied by {leave.appliedBy} on{' '}
                          {format(new Date(leave.appliedAt), 'dd MMM yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          leave.appliedBy === 'ADMIN'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-blue-100 text-blue-800'
                        }
                      >
                        {leave.appliedBy}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(leave.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Leave Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Leave</DialogTitle>
            <DialogDescription>
              Add leave for a photographer on a half-day basis
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="photographer">Photographer</Label>
              <Select value={formPhotographerId} onValueChange={setFormPhotographerId}>
                <SelectTrigger id="photographer">
                  <SelectValue placeholder="Select photographer" />
                </SelectTrigger>
                <SelectContent>
                  {photographers.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {!p.active && '(Inactive)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date">Date</Label>
              <input
                id="date"
                type="date"
                className="w-full px-3 py-2 border rounded-lg mt-1"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="half">Half</Label>
              <select
                id="half"
                className="w-full px-3 py-2 border rounded-lg mt-1"
                value={formHalf}
                onChange={(e) => setFormHalf(e.target.value as LeaveHalf)}
              >
                <option value="FIRST_HALF">First Half</option>
                <option value="SECOND_HALF">Second Half</option>
              </select>
            </div>

            <p className="text-xs text-gray-500">
              💡 For full-day leave, add both First Half and Second Half separately.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleAddLeave}>Add Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this leave? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Remove Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

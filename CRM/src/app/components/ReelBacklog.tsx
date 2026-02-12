import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, adminSupabase } from '../lib/supabase';
import * as reelsDb from '../lib/db/reels';
import * as deliveriesDb from '../lib/db/deliveries';
import * as usersDb from '../lib/db/users';
import type { ReelTask, Delivery, User as UserType } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Film, Check, X, AlertCircle, User, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

export function ReelBacklog() {
  const { user } = useAuth();
  const [reelTasks, setReelTasks] = useState<ReelTask[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<ReelTask | null>(null);
  const [reelLinkInput, setReelLinkInput] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedPhotographer, setSelectedPhotographer] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // V1 ADMIN: Use privileged client for admin to bypass RLS
      const client = user.role === 'ADMIN' ? (adminSupabase || supabase) : supabase;

      // 1. Fetch relevant reel tasks first
      const tasksClient = user.role === 'ADMIN' ? (adminSupabase || supabase) : supabase;
      const allTasks = user.role === 'ADMIN'
        ? await reelsDb.getAllReelTasks(undefined, tasksClient)
        : await reelsDb.getReelTasksByUser(user.id, tasksClient);

      // 2. Extract delivery IDs from tasks
      const deliveryIds = Array.from(new Set(allTasks.map(t => t.delivery_id)));

      // 3. Fetch ONLY those deliveries (using admin client if possible to bypass RLS)
      // This ensures re-assigned tasks are visible even if the delivery belongs to someone else
      const deliveryClient = adminSupabase || supabase;
      const relevantDeliveries = await deliveriesDb.getDeliveriesByIds(deliveryIds, deliveryClient);

      // 4. Fetch users
      const allDbUsers = await usersDb.getUsers(tasksClient);

      setReelTasks(allTasks);
      setDeliveries(relevantDeliveries);
      setAllUsers(allDbUsers);
    } catch (error) {
      console.error('Failed to load reel backlog:', error);
      toast.error('Failed to load reel backlog');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (taskId: string) => {
    if (!reelLinkInput.trim()) {
      toast.error('Please enter a reel link');
      return;
    }

    try {
      // V1 FIX: Use admin client to allow resolving reassigned tasks (bypass RLS)
      const client = adminSupabase || supabase;

      await reelsDb.updateReelTask(taskId, {
        reel_link: reelLinkInput,
        status: 'RESOLVED',
      }, client);

      // V1 FIX: Also update the delivery record so it appears in the Spreadsheet View
      // V1 FIX: Also update the delivery record so it appears in the Spreadsheet View
      // Using the same privileged client to ensure permissions
      const currentTask = reelTasks.find(t => t.id === taskId);
      if (currentTask && currentTask.delivery_id) {
        await deliveriesDb.updateDelivery(currentTask.delivery_id, {
          reel_link: reelLinkInput
        }, client);
      }

      // Update local state
      setReelTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, reel_link: reelLinkInput, status: 'RESOLVED' }
          : t
      ));

      setSelectedTask(null);
      setReelLinkInput('');
      toast.success('Reel task resolved');
    } catch (error) {
      console.error('Failed to resolve reel task:', error);
      toast.error('Failed to resolve reel task');
    }
  };

  const handleReassign = async (taskId: string, newUserId: string) => {
    if (!reassignReason.trim()) {
      toast.error('Please provide a reason for reassignment');
      return;
    }

    try {
      await reelsDb.updateReelTask(taskId, {
        assigned_user_id: newUserId,
        reassigned_reason: reassignReason,
      });

      // Update local state
      setReelTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, assigned_user_id: newUserId, reassigned_reason: reassignReason }
          : t
      ));

      setSelectedTask(null);
      setReassignReason('');
      toast.success('Reel task reassigned');
    } catch (error) {
      console.error('Failed to reassign reel task:', error);
      toast.error('Failed to reassign reel task');
    }
  };

  const pendingTasks = reelTasks.filter(t => t.status === 'PENDING');
  const resolvedTasks = reelTasks.filter(t => t.status === 'RESOLVED');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading reel backlog...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reel Backlog</CardTitle>
          <CardDescription>Track and resolve pending reel tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-2xl font-bold">{pendingTasks.length}</div>
              <div className="text-sm text-gray-500">Pending Tasks</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{resolvedTasks.length}</div>
              <div className="text-sm text-gray-500">Resolved Tasks</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Pending Reels</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pendingTasks.map(task => {
              const delivery = deliveries.find(d => d.id === task.delivery_id);
              if (!delivery) return null;

              // V1 ADMIN: Show photographer name for admin view
              const photographer = allUsers.find(u => u.id === task.assigned_user_id);

              // V1 CRITICAL: Show original delivery owner when task is reassigned
              const originalDeliveryOwner = allUsers.find(u => u.id === delivery.assigned_user_id);

              return (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{delivery.delivery_name}</CardTitle>
                        <CardDescription>{delivery.showroom_code}</CardDescription>
                        {/* V1 ADMIN: Show photographer name for admin view */}
                        {user?.role === 'ADMIN' && photographer && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                            <User className="h-3 w-3" />
                            <span>{photographer.name}</span>
                          </div>
                        )}
                      </div>
                      <Badge className="bg-orange-100 text-orange-800">Pending</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-gray-600">
                      Date: {new Date(delivery.date).toLocaleDateString('en-IN')}
                    </div>

                    {delivery.footage_link && (
                      <div className="flex items-center gap-2 p-2 border rounded bg-gray-50 text-xs">
                        <span className="font-medium text-gray-500">Footage:</span>
                        <a
                          href={delivery.footage_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate"
                        >
                          {delivery.footage_link}
                        </a>
                      </div>
                    )}

                    {task.reassigned_reason && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <div className="flex gap-2">
                          <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-blue-800">
                            <div className="font-semibold">🔄 Reassigned by Admin</div>
                            <div className="text-xs mt-1">
                              <strong>Reason:</strong> {task.reassigned_reason}
                            </div>
                            {originalDeliveryOwner && user?.role === 'PHOTOGRAPHER' && (
                              <div className="text-xs mt-2 pt-2 border-t border-blue-300">
                                <strong>Note:</strong> Reel link will be saved to{' '}
                                <span className="font-semibold">{originalDeliveryOwner.name}'s</span> delivery record
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* V1 ADMIN: Only photographers can add reel links */}
                    {user?.role === 'PHOTOGRAPHER' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full" onClick={() => {
                            setSelectedTask(task);
                            setReelLinkInput(task.reel_link || '');
                          }}>
                            <Film className="h-4 w-4 mr-2" />
                            Add Reel Link
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Resolve Reel Task</DialogTitle>
                            <DialogDescription>
                              Add the reel link for {delivery.delivery_name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Reel Link</Label>
                              <Input
                                type="url"
                                placeholder="https://drive.google.com/..."
                                value={reelLinkInput}
                                onChange={(e) => setReelLinkInput(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => {
                              setSelectedTask(null);
                              setReelLinkInput('');
                            }}>
                              Cancel
                            </Button>
                            <Button onClick={() => handleResolve(task.id)}>
                              <Check className="h-4 w-4 mr-2" />
                              Resolve
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}

                    {/* V1 ADMIN: Admins can reassign reel tasks */}
                    {user?.role === 'ADMIN' && (
                      <Dialog open={reassignDialogOpen && selectedTask?.id === task.id} onOpenChange={(open) => {
                        setReassignDialogOpen(open);
                        if (!open) {
                          setSelectedTask(null);
                          setSelectedPhotographer('');
                          setReassignReason('');
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button className="w-full" variant="outline" onClick={() => {
                            setSelectedTask(task);
                            setSelectedPhotographer(task.assigned_user_id);
                            setReassignDialogOpen(true);
                          }}>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Reassign Reel Task
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reassign Reel Task</DialogTitle>
                            <DialogDescription>
                              Reassign {delivery.delivery_name} to another photographer
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Assign To</Label>
                              <Select value={selectedPhotographer} onValueChange={setSelectedPhotographer}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select photographer" />
                                </SelectTrigger>
                                <SelectContent>
                                  {allUsers
                                    .filter(u => u.role === 'PHOTOGRAPHER' && u.active)
                                    .map(photographer => (
                                      <SelectItem key={photographer.id} value={photographer.id}>
                                        {photographer.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Reason for Reassignment</Label>
                              <Textarea
                                placeholder="e.g., High priority client request"
                                value={reassignReason}
                                onChange={(e) => setReassignReason(e.target.value)}
                                rows={3}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => {
                              setReassignDialogOpen(false);
                              setSelectedTask(null);
                              setSelectedPhotographer('');
                              setReassignReason('');
                            }}>
                              Cancel
                            </Button>
                            <Button onClick={() => {
                              handleReassign(task.id, selectedPhotographer);
                              setReassignDialogOpen(false);
                            }}>
                              <Check className="h-4 w-4 mr-2" />
                              Reassign
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )
      }

      {/* Resolved Tasks */}
      {
        resolvedTasks.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Resolved Reels</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {resolvedTasks.map(task => {
                const delivery = deliveries.find(d => d.id === task.delivery_id);
                if (!delivery) return null;

                // V1 ADMIN: Show photographer name for admin users
                const photographer = allUsers.find(u => u.id === task.assigned_user_id);

                return (
                  <Card key={task.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{delivery.delivery_name}</CardTitle>
                          <CardDescription>{delivery.showroom_code}</CardDescription>
                          {/* V1 ADMIN: Show photographer name for admin view */}
                          {user?.role === 'ADMIN' && photographer && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                              <User className="h-3 w-3" />
                              <span>{photographer.name}</span>
                            </div>
                          )}
                        </div>
                        <Badge className="bg-green-100 text-green-800">Resolved</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-gray-600">
                        Date: {new Date(delivery.date).toLocaleDateString('en-IN')}
                      </div>

                      {delivery.footage_link && (
                        <div className="flex items-center gap-2 p-2 border rounded bg-gray-50 text-xs">
                          <span className="font-medium text-gray-500">Footage:</span>
                          <a
                            href={delivery.footage_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate"
                          >
                            {delivery.footage_link}
                          </a>
                        </div>
                      )}
                      {task.reel_link && (
                        <div className="flex items-center gap-2 p-2 border rounded bg-green-50">
                          <Film className="h-4 w-4 text-green-600" />
                          <a
                            href={task.reel_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-green-700 hover:underline truncate flex-1"
                          >
                            {task.reel_link}
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )
      }

      {/* Empty State */}
      {
        pendingTasks.length === 0 && resolvedTasks.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Film className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No reel tasks found.</p>
            </CardContent>
          </Card>
        )
      }
    </div >
  );
}

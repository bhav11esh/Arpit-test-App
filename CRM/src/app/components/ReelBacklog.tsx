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
import { Film, Check, X, AlertCircle, User, UserCheck, Calendar } from 'lucide-react';
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
      // Standardize on using the public (anon) client for browser-side data loading.
      // RLS policies now handle access for Admins and Photographers.
      const client = supabase;

      // 1. Fetch relevant reel tasks first
      const allTasks = user.role === 'ADMIN'
        ? await reelsDb.getAllReelTasks(undefined, client)
        : await reelsDb.getReelTasksByUser(user.id, client);

      // 2. Extract delivery IDs from tasks
      const deliveryIds = Array.from(new Set(allTasks.map(t => t.delivery_id)));

      // 3. Fetch ONLY those deliveries
      const relevantDeliveries = await deliveriesDb.getDeliveriesByIds(deliveryIds, client);

      // 4. Fetch users
      const allDbUsers = await usersDb.getUsers(client);

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
      const client = supabase;

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
      // V1 FIX: Use admin client for reassignment if admin to bypass RLS
      const client = supabase;

      await reelsDb.updateReelTask(taskId, {
        assigned_user_id: newUserId,
        reassigned_reason: reassignReason,
      }, client);

      // V1 FIX: Sync reassignment back to the delivery record
      const currentTask = reelTasks.find(t => t.id === taskId);
      if (currentTask && currentTask.delivery_id) {
        await deliveriesDb.updateDelivery(currentTask.delivery_id, {
          assigned_user_id: newUserId
        }, client);
        console.log(`🎬 Delivery record updated for ${currentTask.delivery_id} -> ${newUserId}`);
      }

      // Update local state
      setReelTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, assigned_user_id: newUserId, reassigned_reason: reassignReason }
          : t
      ));

      setSelectedTask(null);
      setReassignReason('');
      toast.success('Reel task reassigned and delivery synced');
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
      <Card className="stat-card-primary border-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <Film className="h-24 w-24" />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-orange-700 tracking-tight">Reel Backlog</CardTitle>
          <CardDescription className="text-orange-400">Track and resolve pending reel tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white/50">
              <div className="text-3xl font-bold text-orange-700 tracking-tighter">{pendingTasks.length}</div>
              <div className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mt-1">Pending</div>
            </div>
            <div className="bg-emerald-50/50 backdrop-blur-sm p-4 rounded-2xl border border-emerald-100/50">
              <div className="text-3xl font-bold text-emerald-600 tracking-tighter">{resolvedTasks.length}</div>
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1">Resolved</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 ml-1">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Pending Reels</h2>
          </div>
          <div className="grid gap-4">
            {pendingTasks.map(task => {
              const delivery = deliveries.find(d => d.id === task.delivery_id);
              if (!delivery) return null;

              // V1 ADMIN: Show photographer name for admin view
              const photographer = allUsers.find(u => u.id === task.assigned_user_id);

              // V1 CRITICAL: Show original delivery owner when task is reassigned
              const originalDeliveryOwner = allUsers.find(u => u.id === delivery.assigned_user_id);

              return (
                <Card key={task.id} className="delivery-accent-pending shadow-sm hover:shadow-md transition-all duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{delivery.delivery_name}</CardTitle>
                        <CardDescription className="text-xs truncate">{delivery.showroom_code}</CardDescription>
                        {/* V1 ADMIN: Show photographer name for admin view */}
                        {user?.role === 'ADMIN' && photographer && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-medium text-orange-500 bg-orange-50 w-fit px-2 py-0.5 rounded-full">
                            <User className="h-3 w-3" />
                            <span>{photographer.name}</span>
                          </div>
                        )}
                      </div>
                      <Badge className="bg-amber-50 text-amber-600 border-amber-100 text-[10px] px-2 py-0">Pending</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(delivery.date).toLocaleDateString('en-IN')}</span>
                    </div>

                    {delivery.footage_link && (
                      <div className="flex items-center gap-2 p-2.5 border border-orange-50 rounded-xl bg-orange-50/30 text-[11px] min-w-0">
                        <span className="font-bold text-orange-400 uppercase tracking-tighter">Footage:</span>
                        <a
                          href={delivery.footage_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 font-medium hover:underline truncate"
                        >
                          {delivery.footage_link}
                        </a>
                      </div>
                    )}

                    {task.reassigned_reason && (
                      <div className="bg-zinc-50/50 border border-zinc-100 rounded-xl p-3">
                        <div className="flex gap-2">
                          <AlertCircle className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0 mt-0.5" />
                          <div className="text-[11px] text-zinc-700 leading-relaxed">
                            <div className="font-bold flex items-center gap-1.5 mb-1 text-zinc-800">
                               <span>🔄</span> REASSIGNED BY ADMIN
                            </div>
                            <div className="opacity-80">
                              <strong>Reason:</strong> {task.reassigned_reason}
                            </div>
                            {originalDeliveryOwner && user?.role === 'PHOTOGRAPHER' && (
                              <div className="mt-2 pt-2 border-t border-zinc-100 opacity-60 italic">
                                Note: Saved to {originalDeliveryOwner.name}'s record
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
                          <Button className="w-full btn-gradient h-10" onClick={() => {
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
            <div className="flex items-center gap-2 ml-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Resolved Reels</h2>
            </div>
            <div className="grid gap-4">
              {resolvedTasks.map(task => {
                const delivery = deliveries.find(d => d.id === task.delivery_id);
                if (!delivery) return null;

                // V1 ADMIN: Show photographer name for admin users
                const photographer = allUsers.find(u => u.id === task.assigned_user_id);

                return (
                  <Card key={task.id} className="delivery-accent-done opacity-80 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{delivery.delivery_name}</CardTitle>
                          <CardDescription className="text-xs truncate">{delivery.showroom_code}</CardDescription>
                          {/* V1 ADMIN: Show photographer name for admin view */}
                          {user?.role === 'ADMIN' && photographer && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
                              <User className="h-3 w-3" />
                              <span>{photographer.name}</span>
                            </div>
                          )}
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px] px-2 py-0">Resolved</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(delivery.date).toLocaleDateString('en-IN')}</span>
                      </div>

                      {task.reel_link && (
                        <div className="flex items-center gap-2 p-2.5 border border-emerald-100 rounded-xl bg-emerald-50/50 min-w-0">
                          <Film className="h-3.5 w-3.5 text-emerald-500" />
                          <a
                            href={task.reel_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-emerald-700 hover:underline truncate flex-1 tracking-tight"
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
          <div className="py-20 flex flex-col items-center justify-center bg-white/50 rounded-3xl border-2 border-dashed border-gray-100">
            <div className="h-20 w-20 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mb-6">
              <Film className="h-10 w-10" />
            </div>
            <p className="text-gray-300 font-bold uppercase tracking-widest text-sm">No tasks found</p>
          </div>
        )
      }
    </div >
  );
}

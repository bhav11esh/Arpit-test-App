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
import { Film, Check, X, AlertCircle, User, UserCheck, Calendar, Phone, DollarSign, Clock, ExternalLink, Trophy, Landmark } from 'lucide-react';
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
  const [postItReels, setPostItReels] = useState<(ReelTask & { delivery?: Delivery })[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);

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

      // 5. NEW: Refresh and Fetch Post-its for photographers
      if (user.role === 'PHOTOGRAPHER') {
        try {
          await reelsDb.refreshPostIts(client);
          const availablePostIts = await reelsDb.getPostItReels(client);
          setPostItReels(availablePostIts);
        } catch (postItError) {
          console.error('Failed to load post-its:', postItError);
        }
      }

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

  const handleClaimPostIt = async (taskId: string) => {
    if (!user) return;
    try {
      setClaiming(taskId);
      await reelsDb.claimPostIt(taskId, user.id);
      toast.success('Bounty claimed! You have 24 hours to resolve it.');
      // Refresh data to show it in pending
      loadData();
    } catch (error: any) {
      console.error('Failed to claim post-it:', error);
      toast.error(error.message || 'Failed to claim post-it');
    } finally {
      setClaiming(null);
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

  const pendingTasks = reelTasks.filter(t => t.status === 'PENDING' && !t.is_post_it);
  // V18.3: Resolved section logic
  // Only show entries where the reel was reassigned to them (Admin or Post-it)
  const resolvedTasks = user?.role === 'ADMIN' 
    ? reelTasks.filter(t => t.status === 'RESOLVED')
    : reelTasks.filter(t => t.status === 'RESOLVED' && t.reassigned_reason !== null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading reel backlog...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1 sm:p-4 pb-20">
      {/* NEW: Bounty Board / Post-its Marketplace */}
      {postItReels.length > 0 && user?.role === 'PHOTOGRAPHER' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></div>
              <h2 className="text-[11px] font-bold text-gray-800 uppercase tracking-widest">REEL EDIT POST-IT's: GET PAID</h2>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              <Trophy className="h-3 w-3" />
              <span>BOUNTIES ACTIVE</span>
            </div>
          </div>
          
          <div className="grid gap-4">
            {postItReels.map(task => {
              const delivery = task.delivery;
              if (!delivery) return null;
              
              const shooter = allUsers.find(u => u.id === task.original_user_id);
              
              return (
                <Card key={task.id} className="relative overflow-hidden border-2 border-orange-100 shadow-md hover:shadow-lg transition-all bg-gradient-to-br from-white to-orange-50/20">
                  <div className="absolute top-0 right-0">
                    <div className="bg-orange-600 text-white text-[12px] font-black px-4 py-1.5 rounded-bl-2xl shadow-sm flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>₹{task.post_it_reward || 250}</span>
                    </div>
                  </div>

                  <CardHeader className="pb-2">
                    <div className="pr-16">
                      <CardTitle className="text-base font-black text-gray-800 leading-tight">
                        {delivery.delivery_name}
                      </CardTitle>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-gray-500">
                        <Landmark className="h-3 w-3" />
                        <span>{delivery.showroom_code}</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="flex items-center gap-2 text-[10px] text-gray-600 font-medium">
                        <Calendar className="h-3 w-3 text-orange-400" />
                        <span>Shot on {new Date(delivery.date).toLocaleDateString('en-IN')}</span>
                      </div>
                      {delivery.customer_phone && delivery.payment_type === 'CUSTOMER_PAID' && (
                        <div className="flex items-center gap-2 text-[10px] text-gray-600 font-medium">
                          <Phone className="h-3 w-3 text-orange-400" />
                          <span>Cust: {delivery.customer_phone}</span>
                        </div>
                      )}
                    </div>

                    {delivery.footage_link && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-orange-100/50 shadow-inner group">
                        <div className="flex items-center gap-2 min-w-0">
                          <Film className="h-3 w-3 text-orange-500" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Footage Link</span>
                        </div>
                        <a 
                          href={delivery.footage_link} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 transition-colors"
                        >
                          Open Folder
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-1">
                      {shooter && (
                        <div className="flex items-center gap-1.5">
                          <div className="size-6 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 border border-orange-200">
                            {shooter.name.charAt(0)}
                          </div>
                          <div className="text-[10px] leading-tight">
                            <div className="text-gray-400 font-bold uppercase tracking-tighter text-[8px]">Shooter</div>
                            <div className="text-gray-700 font-bold flex items-center gap-1">
                              {shooter.name}
                              {shooter.phone_number && (
                                <a href={`tel:${shooter.phone_number}`} className="text-orange-500 hover:text-orange-600">
                                  <Phone className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <Button 
                        size="sm" 
                        onClick={() => handleClaimPostIt(task.id)}
                        disabled={claiming === task.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] px-4 rounded-xl shadow-lg shadow-emerald-200 border-b-4 border-emerald-800 active:border-b-0 active:mt-1 transition-all h-9"
                      >
                        {claiming === task.id ? 'CLAIMING...' : 'CLAIM BOUNTY'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Card className="stat-card-primary border-0 overflow-hidden relative shadow-sm">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Film className="h-16 w-16" />
        </div>
        <CardHeader className="pb-2 p-4">
          <CardTitle className="text-orange-700 tracking-tight text-lg">Reel Backlog</CardTitle>
          <CardDescription className="text-orange-400 text-xs">Track and resolve pending reel tasks</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="bg-white/50 backdrop-blur-sm p-3 rounded-xl border border-white/50">
              <div className="text-2xl font-bold text-orange-700 tracking-tighter">{pendingTasks.length}</div>
              <div className="text-[9px] font-bold text-orange-400 uppercase tracking-widest mt-1">Pending</div>
            </div>
            <div className="bg-emerald-50/50 backdrop-blur-sm p-3 rounded-xl border border-emerald-100/50">
              <div className="text-2xl font-bold text-emerald-600 tracking-tighter">{resolvedTasks.length}</div>
              <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-1">Resolved</div>
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
                      <div className="flex-1 min-w-0 pr-2 overflow-hidden">
                        <CardTitle className="text-sm font-bold leading-tight" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                          {delivery.delivery_name}
                        </CardTitle>
                        <CardDescription className="text-[10px] truncate mt-0.5">{delivery.showroom_code}</CardDescription>
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
                    {/* V18.3: Show 24h deadline countdown for claimed post-its */}
                    {task.claim_deadline && (
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] font-black text-red-600 bg-red-50 border border-red-100 w-fit px-2 py-1 rounded-lg animate-pulse">
                        <Clock className="h-3 w-3" />
                        <span>DEADLINE: {new Date(task.claim_deadline).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ({new Date(task.claim_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})</span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(delivery.date).toLocaleDateString('en-IN')}</span>
                    </div>

                    {delivery.footage_link && (
                      <div className="flex flex-col gap-1 p-2.5 border border-orange-50 rounded-xl bg-orange-50/30 text-[11px] w-full overflow-hidden">
                        <span className="font-bold text-orange-400 uppercase tracking-tighter text-[9px]">Footage Link:</span>
                        <a
                          href={delivery.footage_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 font-medium hover:underline break-all whitespace-normal"
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
                        <Button className="w-full btn-gradient h-8 text-xs" onClick={() => {
                            setSelectedTask(task);
                            setReelLinkInput(task.reel_link || '');
                          }}>
                            <Film className="h-3.5 w-3.5 mr-2" />
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
                          <Button className="w-full h-8 text-xs" variant="outline" onClick={() => {
                            setSelectedTask(task);
                            setSelectedPhotographer(task.assigned_user_id);
                            setReassignDialogOpen(true);
                          }}>
                            <UserCheck className="h-3.5 w-3.5 mr-2" />
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
                        <div className="flex-1 min-w-0 pr-2 overflow-hidden">
                          <CardTitle className="text-sm font-bold leading-tight" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                            {delivery.delivery_name}
                          </CardTitle>
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
                      {/* V18.3: Show bounty amount if it was a post-it task */}
                      {task.post_it_reward && (
                        <div className="flex items-center gap-1.5 mt-2 bg-emerald-600 text-white w-fit px-2.5 py-1 rounded-full text-[10px] font-black shadow-sm">
                          <Trophy className="h-3 w-3" />
                          <span>+₹{task.post_it_reward} EARNED</span>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(delivery.date).toLocaleDateString('en-IN')}</span>
                      </div>

                      {task.reel_link && (
                        <div className="flex flex-col gap-1 p-2.5 border border-emerald-100 rounded-xl bg-emerald-50/50 w-full overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <Film className="h-3 w-3 text-emerald-500" />
                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">Resolved Reel:</span>
                          </div>
                          <a
                            href={task.reel_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-emerald-700 hover:underline break-all whitespace-normal flex-1 tracking-tight"
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

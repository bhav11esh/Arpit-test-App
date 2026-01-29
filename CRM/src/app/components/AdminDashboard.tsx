import React, { useState, useEffect } from 'react';
import { mockDeliveries, mockScreenshots, mockUsers, simulateApiDelay } from '../lib/mockData';
import type { Delivery } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { getStatusColor } from '../lib/utils';
import { Download, Search, Trash2, Eye, FileSpreadsheet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { UnassignmentDialog } from './UnassignmentDialog';
import { toast } from 'sonner';

interface AdminDashboardProps {
  adminView?: boolean;
}

export function AdminDashboard({ adminView = false }: AdminDashboardProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [screenshots, setScreenshots] = useState<Map<string, any[]>>(new Map());
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [unassignmentDialog, setUnassignmentDialog] = useState<{
    open: boolean;
    delivery: Delivery | null;
    photographerName: string;
  }>({ open: false, delivery: null, photographerName: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await simulateApiDelay();
    
    setDeliveries(mockDeliveries);
    
    // Group screenshots by delivery
    const screenshotMap = new Map<string, any[]>();
    mockScreenshots.forEach(screenshot => {
      const existing = screenshotMap.get(screenshot.delivery_id) || [];
      screenshotMap.set(screenshot.delivery_id, [...existing, screenshot]);
    });
    setScreenshots(screenshotMap);
    
    setLoading(false);
  };

  const handleDeleteScreenshot = async (screenshotId: string, deliveryId: string) => {
    await simulateApiDelay(300);
    
    setScreenshots(prev => {
      const newMap = new Map(prev);
      const deliveryScreenshots = newMap.get(deliveryId) || [];
      newMap.set(
        deliveryId,
        deliveryScreenshots.map(s => 
          s.id === screenshotId 
            ? { ...s, deleted_at: new Date().toISOString() }
            : s
        )
      );
      return newMap;
    });
    
    toast.success('Screenshot deleted');
  };

  const handleExportCSV = () => {
    // Simulate CSV export
    const csv = [
      ['Date', 'Delivery Name', 'Status', 'Assigned To', 'Footage Link', 'Payment Type'].join(','),
      ...filteredDeliveries.map(d => {
        const user = mockUsers.find(u => u.id === d.assigned_user_id);
        return [
          d.date,
          d.delivery_name,
          d.status,
          user?.name || 'Unassigned',
          d.footage_link || '',
          d.payment_type
        ].join(',');
      })
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deliveries-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast.success('CSV exported successfully');
  };

  const handleReassign = async (deliveryId: string, newUserId: string) => {
    await simulateApiDelay(300);
    
    // V1 CRITICAL: Clear footage_link when reassigning or unassigning
    // - Footage link is the photographer's work product
    // - New photographer should start fresh
    // - Prevents accidental submission of previous photographer's footage
    setDeliveries(prev => prev.map(d => 
      d.id === deliveryId 
        ? { 
            ...d, 
            assigned_user_id: newUserId || null,
            footage_link: null, // Clear footage link on any reassignment
            updated_at: new Date().toISOString() 
          }
        : d
    ));
    
    toast.success('Delivery reassigned');
  };

  // V1 FIX: Handle primary delivery unassignment with reason requirement
  const handleUnassignmentRequest = (delivery: Delivery) => {
    const user = mockUsers.find(u => u.id === delivery.assigned_user_id);
    
    // V1 SPEC: Primary deliveries require reason for unassignment
    if (delivery.showroom_type === 'PRIMARY' && delivery.assigned_user_id) {
      setUnassignmentDialog({
        open: true,
        delivery,
        photographerName: user?.name || 'Unknown',
      });
    } else {
      // Non-primary deliveries can be unassigned directly
      handleReassign(delivery.id, '');
    }
  };

  const handleConfirmUnassignment = async (reason: string) => {
    if (!unassignmentDialog.delivery) return;

    await simulateApiDelay(300);

    const delivery = unassignmentDialog.delivery;
    const timestamp = new Date().toISOString();

    // V1 FIX: Log unassignment with reason, timestamp, photographer name
    // V1 CRITICAL: Clear footage_link when unassigning (photographer's work product removed)
    setDeliveries(prev => prev.map(d =>
      d.id === delivery.id
        ? {
            ...d,
            assigned_user_id: null,
            footage_link: null, // Clear footage link on unassignment
            unassignment_reason: reason,
            unassignment_timestamp: timestamp,
            unassignment_by: unassignmentDialog.photographerName,
            updated_at: timestamp,
          }
        : d
    ));

    setUnassignmentDialog({ open: false, delivery: null, photographerName: '' });
    toast.success('Primary delivery unassigned and logged');
  };

  // Filter deliveries
  const filteredDeliveries = deliveries.filter(d => {
    if (filterStatus !== 'ALL' && d.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        d.delivery_name.toLowerCase().includes(query) ||
        d.showroom_code.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* V1 FIX: Unassignment Dialog for Primary Deliveries */}
      {unassignmentDialog.delivery && (
        <UnassignmentDialog
          open={unassignmentDialog.open}
          delivery={unassignmentDialog.delivery}
          photographerName={unassignmentDialog.photographerName}
          onConfirm={handleConfirmUnassignment}
          onCancel={() => setUnassignmentDialog({ open: false, delivery: null, photographerName: '' })}
        />
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Deliveries</CardDescription>
            <CardTitle className="text-3xl">{deliveries.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl">
              {deliveries.filter(d => d.status === 'PENDING').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Assigned</CardDescription>
            <CardTitle className="text-3xl">
              {deliveries.filter(d => d.status === 'ASSIGNED').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl">
              {deliveries.filter(d => d.status === 'DONE').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Unassigned</CardDescription>
            <CardTitle className="text-3xl">
              {deliveries.filter(d => d.status === 'UNASSIGNED').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <CardTitle>All Deliveries</CardTitle>
              <CardDescription>Manage and view all delivery records</CardDescription>
            </div>
            <Button onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or showroom..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Deliveries Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivery Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Screenshots</TableHead>
                  <TableHead>Footage</TableHead>
                  {adminView && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliveries.map(delivery => {
                  const user = mockUsers.find(u => u.id === delivery.assigned_user_id);
                  const deliveryScreenshots = screenshots.get(delivery.id) || [];
                  const activeScreenshots = deliveryScreenshots.filter(s => !s.deleted_at);

                  return (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">{delivery.delivery_name}</TableCell>
                      <TableCell>{new Date(delivery.date).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(delivery.status)}>
                          {delivery.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{user?.name || 'Unassigned'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{delivery.payment_type.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        {activeScreenshots.length > 0 ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="gap-2">
                                <Eye className="h-4 w-4" />
                                {activeScreenshots.length}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Screenshots - {delivery.delivery_name}</DialogTitle>
                              </DialogHeader>
                              <div className="grid gap-4 md:grid-cols-2">
                                {activeScreenshots.map(screenshot => (
                                  <div key={screenshot.id} className="space-y-2">
                                    <img 
                                      src={screenshot.file_url} 
                                      alt={screenshot.type}
                                      className="w-full rounded border"
                                    />
                                    <div className="flex items-center justify-between">
                                      <Badge variant="outline">{screenshot.type}</Badge>
                                      {adminView && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteScreenshot(screenshot.id, delivery.id)}
                                        >
                                          <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="text-sm text-gray-400">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {delivery.footage_link ? (
                          <a 
                            href={delivery.footage_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">Not added</span>
                        )}
                      </TableCell>
                      {adminView && (
                        <TableCell>
                          <Select
                            value={delivery.assigned_user_id || 'unassigned'}
                            onValueChange={(value) => {
                              if (value !== 'unassigned') {
                                handleReassign(delivery.id, value);
                              } else {
                                handleUnassignmentRequest(delivery);
                              }
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {mockUsers.filter(u => u.role === 'PHOTOGRAPHER').map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredDeliveries.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No deliveries found matching your filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
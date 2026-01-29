import React, { useState, useEffect } from 'react';
import type { LogEvent } from '../types';
import { getAllLogs, downloadLogsAsCSV, clearAllLogs, LogEventType } from '../lib/logging';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Download, Trash2, FileText, Filter } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';

export function AdminLogsViewer() {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEvent[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, filterType, searchQuery]);

  const loadLogs = () => {
    const allLogs = getAllLogs();
    setLogs(allLogs);
  };

  const applyFilters = () => {
    let filtered = [...logs];

    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.type === filterType);
    }

    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actor_user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.target_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        JSON.stringify(log.metadata).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLogs(filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
  };

  const handleDownload = () => {
    downloadLogsAsCSV();
    toast.success('Logs exported successfully');
  };

  const handleClearLogs = () => {
    clearAllLogs();
    setLogs([]);
    toast.success('All logs cleared');
  };

  const getEventTypeColor = (type: string): string => {
    if (type.includes('BREACH')) return 'bg-red-100 text-red-800';
    if (type.includes('REJECTED')) return 'bg-orange-100 text-orange-800';
    if (type.includes('ACCEPTED') || type.includes('COMPLETED')) return 'bg-green-100 text-green-800';
    if (type.includes('UPDATED') || type.includes('ADDED')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>Immutable event log for all system actions</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All Logs?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all log events. This action cannot be undone.
                      According to spec, this is equivalent to deleting the entire report file.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearLogs} className="bg-red-600">
                      Delete All Logs
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Filter by Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="DELIVERY_ACCEPTED">Delivery Accepted</SelectItem>
                  <SelectItem value="DELIVERY_REJECTED">Delivery Rejected</SelectItem>
                  <SelectItem value="TIMING_UPDATED">Timing Updated</SelectItem>
                  <SelectItem value="FOOTAGE_LINK_ADDED">Footage Link Added</SelectItem>
                  <SelectItem value="SCREENSHOT_UPLOADED">Screenshot Uploaded</SelectItem>
                  <SelectItem value="GEOFENCE_BREACH">Geofence Breach</SelectItem>
                  <SelectItem value="SEND_UPDATE_COMPLETED">Send Update Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search by ID, user, target..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Log List */}
          <div className="space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>No logs found</p>
              </div>
            ) : (
              filteredLogs.map(log => (
                <div
                  key={log.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getEventTypeColor(log.type)}>
                          {log.type.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Actor:</span>{' '}
                          <span className="font-mono text-xs">{log.actor_user_id}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Target:</span>{' '}
                          <span className="font-mono text-xs">{log.target_id}</span>
                        </div>
                      </div>
                      {Object.keys(log.metadata).length > 0 && (
                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {filteredLogs.length} of {logs.length} total logs
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

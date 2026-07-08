import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useLeave } from '../context/LeaveContext';
import { useNavigate } from 'react-router-dom';
import { mockScreenshots, simulateApiDelay } from '../lib/mockData';
import * as deliveriesDb from '../lib/db/deliveries';
import * as reelsDb from '../lib/db/reels';
import { adminSupabase, supabase } from '../lib/supabase';
import type { Delivery } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import {
  getLocalDateString,
  getOperationalDateString,
  formatDateForSheet,
  getStatusColor,
  getShowroomCode,
  getDeliverySignature,
} from '../lib/utils';
import { Download, Trash2, ChevronLeft, ChevronRight, Grid, FileText, Lock, Undo2, Redo2, Edit2, Check, X, Settings, Calendar, Trophy, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { AdminLogsViewer } from './AdminLogsViewer';
import { EarningsTracker } from './EarningsTracker';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';
import { LiveBookingsView } from './LiveBookingsView';
import * as configDb from '../lib/db/config';
import * as notificationsDb from '../lib/db/notifications';
import * as leavesDb from '../lib/db/leaves';
import * as screenshotsDb from '../lib/db/screenshots';
import * as standupDb from '../lib/db/standup';
import { BellRing, ClipboardCheck, Bell, CheckCircle2, Upload, RefreshCw, Clock, ShieldCheck, Eye } from 'lucide-react';
import { SearchableSelect } from './ui/searchable-select';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface FraudAuditShowroomCardProps {
  showroomCode: string;
  selectedPhotographer: string;
  spreadSheetDate: string;
  deliveries: Delivery[];
  screenshots: any[];
  dealerships: any[];
  currentStandupCall: any;
  handoverLogs: any[];
  user: any;
  setCurrentImageIndex: React.Dispatch<React.SetStateAction<number>>;
  setGalleryViewMode: React.Dispatch<React.SetStateAction<'single' | 'grid'>>;
  handleTriggerSheetSync: (delivery: any, action: string, metadata: any) => Promise<void>;
  loadData: () => void;
}

function FraudAuditShowroomCard({
  showroomCode,
  selectedPhotographer,
  spreadSheetDate,
  deliveries,
  screenshots,
  dealerships,
  currentStandupCall,
  handoverLogs,
  user,
  setCurrentImageIndex,
  setGalleryViewMode,
  handleTriggerSheetSync,
  loadData
}: FraudAuditShowroomCardProps) {
  const showroomDeliveries = deliveries.filter(d => 
    d.assigned_user_id === selectedPhotographer && 
    d.date === spreadSheetDate && 
    d.status === 'DONE' &&
    getShowroomCode(d.showroom_code) === showroomCode
  );
  
  const dealership = dealerships.find(d => getShowroomCode(d.name) === showroomCode);
  const displayShowroomName = dealership ? dealership.name : showroomCode;

  // Fraud verification is done once per photographer + dealership + date.
  // Check if any of these deliveries have witness_phone or call log screenshot.
  const verifiedDelivery = showroomDeliveries.find(d => 
    !!d.witness_phone && 
    screenshots.some(s => s.delivery_id === d.id && s.type === 'FRAUD_DETECTION' && !s.deleted_at)
  );
  
  // Grab fraud screenshots (both photographer's dealership doc and admin's call log verification)
  const fraudScreenshots = screenshots.filter(s => 
    s.type === 'FRAUD_DETECTION' && 
    !s.deleted_at && 
    (s.showroom_code === showroomCode || (s.delivery_id && showroomDeliveries.some(d => d.id === s.delivery_id)))
  );
  
  const deliveryFraudScreenshots = fraudScreenshots.filter(s => s.delivery_id && showroomDeliveries.some(d => d.id === s.delivery_id));
  const mainFraudScreenshot = fraudScreenshots.find(s => s.type === 'FRAUD_DETECTION' && !s.delivery_id) || deliveryFraudScreenshots[0];
  const callLogScreenshot = deliveryFraudScreenshots.length > 1 ? deliveryFraudScreenshots[1] : deliveryFraudScreenshots[0];

  // local state mapping
  const [witnessPhone, setWitnessPhone] = useState(verifiedDelivery?.witness_phone || '');
  const [callLogFile, setCallLogFile] = useState<File | null>(null);
  const [submittingFraud, setSubmittingFraud] = useState(false);
  const [previousWitnessPhones, setPreviousWitnessPhones] = useState<{ phone: string; date: string }[]>([]);

  useEffect(() => {
    const fetchPreviousWitnessPhones = async () => {
      try {
        const { data, error } = await supabase
          .from('deliveries')
          .select('witness_phone, date, showroom_code')
          .not('witness_phone', 'is', null)
          .neq('witness_phone', '')
          .order('date', { ascending: false });

        if (!error && data) {
          const matching = data.filter(d => getShowroomCode(d.showroom_code) === showroomCode);
          
          const phoneList: { phone: string; date: string }[] = [];
          const seen = new Set<string>();
          
          for (const item of matching) {
            if (!seen.has(item.witness_phone)) {
              seen.add(item.witness_phone);
              phoneList.push({
                phone: item.witness_phone,
                date: item.date
              });
            }
            if (phoneList.length >= 3) break;
          }
          setPreviousWitnessPhones(phoneList);
        }
      } catch (err) {
        console.error('Failed to fetch previous witness phones:', err);
      }
    };

    fetchPreviousWitnessPhones();
  }, [showroomCode]);

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center justify-between">
          <span>{displayShowroomName}</span>
          {verifiedDelivery ? (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 font-semibold">
              Audited & Verified
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200">
              Pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Read-Only Info Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-3 rounded border text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Deliveries Completed:</span>
            <span className="font-bold text-gray-900">{showroomDeliveries.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Morning Standup Confirmed Count:</span>
            <span className="font-bold text-gray-900">
              {currentStandupCall?.confirmed_count != null ? currentStandupCall.confirmed_count : 'Not logged'}
            </span>
          </div>
        </div>

        {/* Images Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-gray-600 block">Photographer Dealership doc screenshot:</span>
            {mainFraudScreenshot ? (
              <div className="relative group border rounded-lg overflow-hidden bg-gray-100 h-40 flex items-center justify-center">
                <img 
                  src={mainFraudScreenshot.file_url} 
                  alt="dealership doc" 
                  className="max-h-full object-contain cursor-pointer"
                  onClick={() => {
                    setCurrentImageIndex(screenshots.indexOf(mainFraudScreenshot));
                    setGalleryViewMode('single');
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                    <Eye className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-40 border-2 border-dashed rounded-lg bg-gray-50 flex flex-col items-center justify-center text-xs text-gray-400">
                No dealership document uploaded by photographer
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-gray-600 block">Witness Call Log verification screenshot:</span>
            {verifiedDelivery && callLogScreenshot ? (
              <div className="relative group border rounded-lg overflow-hidden bg-gray-100 h-40 flex items-center justify-center">
                <img 
                  src={callLogScreenshot.file_url} 
                  alt="call log" 
                  className="max-h-full object-contain"
                />
              </div>
            ) : !verifiedDelivery ? (
              <div className="h-40 border-2 border-dashed rounded-lg bg-gray-50 flex flex-col items-center justify-center text-xs text-gray-400">
                {callLogFile ? (
                  <div className="p-4 text-center">
                    <span className="text-green-600 font-semibold block">Image selected:</span>
                    <span className="truncate max-w-[150px] block mt-1">{callLogFile.name}</span>
                    <Button 
                      variant="ghost" 
                      className="mt-2 text-xs text-red-500 h-6 px-2 hover:bg-red-50"
                      onClick={() => setCallLogFile(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center p-6 text-center hover:bg-gray-100/50 w-full h-full justify-center ${
                    handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'FRAUD') && user.role === 'ADMIN' ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                  }`}>
                    <Upload className="h-5 w-5 text-gray-400 mb-1" />
                    <span>Upload Call Log Screenshot <span className="text-red-500">*</span></span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      disabled={handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'FRAUD') && user.role === 'ADMIN'}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setCallLogFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            ) : (
              <div className="h-40 border-2 border-dashed rounded-lg bg-gray-50 flex flex-col items-center justify-center text-xs text-gray-400">
                Screenshot not found
              </div>
            )}
          </div>
        </div>

        {/* Witness Phone Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 block">
              Witness Phone Number <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              maxLength={10}
              placeholder="Enter 10-digit number"
              value={witnessPhone}
              onChange={(e) => setWitnessPhone(e.target.value.replace(/\D/g, ''))}
              disabled={!!verifiedDelivery || (handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'FRAUD') && user.role === 'ADMIN')}
              className="h-9"
            />
            {previousWitnessPhones.length > 0 && (
              <div className="mt-1.5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Previous Witness Numbers (Click to use):</span>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {previousWitnessPhones.map((pw, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="text-[10px] cursor-pointer hover:bg-gray-200 transition-colors font-medium"
                      onClick={() => {
                        if (!verifiedDelivery && !(handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'FRAUD') && user.role === 'ADMIN')) {
                          setWitnessPhone(pw.phone);
                        }
                      }}
                    >
                      {pw.phone} ({pw.date})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!verifiedDelivery && (
            <Button
              onClick={async () => {
                if (submittingFraud) return;
                if (witnessPhone.length < 10) {
                  toast.error('Witness Phone Number must be 10 digits');
                  return;
                }
                if (!callLogFile) {
                  toast.error('Please upload witness call log verification screenshot');
                  return;
                }
                
                setSubmittingFraud(true);
                try {
                  const client = supabase;
                  // 1. Update witness_phone for all deliveries at this dealership
                  const updatePromises = showroomDeliveries.map(async d => {
                    const updated = await deliveriesDb.updateDelivery(d.id, {
                      witness_phone: witnessPhone
                    }, client);
                    // Sync with Google Sheets
                    await handleTriggerSheetSync(updated, 'sync', null);
                    return updated;
                  });
                  const updatedDels = await Promise.all(updatePromises);
                  
                  // 2. Upload and attach call log screenshot to the first delivery
                  const path = `call_logs/${updatedDels[0].id}_${Date.now()}.jpg`;
                  const url = await screenshotsDb.uploadScreenshotFile(callLogFile, path, client);
                  await screenshotsDb.createScreenshot({
                    delivery_id: updatedDels[0].id,
                    user_id: selectedPhotographer,
                    type: 'FRAUD_DETECTION',
                    file_url: url,
                    thumbnail_url: url,
                    deleted_at: null
                  }, client);

                  toast.success(`Fraud audits verified for ${displayShowroomName}`);
                  loadData();
                } catch (err) {
                  console.error('Failed to submit fraud verification:', err);
                  toast.error('Failed to submit fraud verification');
                } finally {
                  setSubmittingFraud(false);
                }
              }}
              disabled={submittingFraud || witnessPhone.length < 10 || !callLogFile}
              className="h-9 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
            >
              {submittingFraud ? 'Verifying...' : 'Submit Fraud Audit'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface CallLogsViewerProps {
  spreadSheetDate: string;
  setSpreadSheetDate: (d: string) => void;
  selectedPhotographer: string;
  setSelectedPhotographer: (p: string) => void;
  photographers: any[];
  deliveries: any[];
  screenshots: any[];
  dealerships: any[];
  allStandupCalls: any[];
  setCurrentImageIndex: React.Dispatch<React.SetStateAction<number>>;
  setGalleryViewMode: React.Dispatch<React.SetStateAction<'single' | 'grid'>>;
}

function CallLogsViewer({
  spreadSheetDate,
  setSpreadSheetDate,
  selectedPhotographer,
  setSelectedPhotographer,
  photographers,
  deliveries,
  screenshots,
  dealerships,
  allStandupCalls,
  setCurrentImageIndex,
  setGalleryViewMode
}: CallLogsViewerProps) {
  // 1. Gather Morning Standup Call Logs
  const standupLogs = allStandupCalls
    .filter(c => c.call_log_screenshot_url && (selectedPhotographer === 'all' || c.photographer_id === selectedPhotographer))
    .map(c => {
      const photographer = photographers.find(p => p.id === c.photographer_id);
      return {
        id: `standup_${c.id}`,
        fileUrl: c.call_log_screenshot_url,
        photographerName: photographer ? photographer.name : 'Unknown Photographer',
        taskType: 'Morning Standup',
        showroom: null,
        date: c.date
      };
    });

  // 3. Gather Customer Call Logs
  const customerCallLogs = screenshots
    .filter(s => s.type === 'CUSTOMER_CALL_LOG' && s.delivery_id && !s.deleted_at)
    .filter(s => selectedPhotographer === 'all' || s.user_id === selectedPhotographer)
    .map(s => {
      const del = deliveries.find(d => d.id === s.delivery_id);
      if (!del || del.date !== spreadSheetDate) return null;
      
      const photographer = photographers.find(p => p.id === s.user_id);
      const dealership = dealerships.find(d => getShowroomCode(d.name) === getShowroomCode(del.showroom_code));
      const displayShowroomName = dealership ? dealership.name : del.showroom_code;

      return {
        id: `cust_${s.id}`,
        fileUrl: s.file_url,
        photographerName: photographer ? photographer.name : 'Unknown Photographer',
        taskType: 'Customer Paid Call Log',
        showroom: displayShowroomName,
        date: del.date
      };
    })
    .filter((log): log is NonNullable<typeof log> => log !== null);

  const combinedLogs = [...standupLogs, ...fraudLogs, ...customerCallLogs];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Call Logs</h2>
          <p className="text-sm text-gray-500">View uploaded call log verification screenshots for Morning Standups and Dealership Fraud Audits</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 block">Select Audit Date</label>
            <Input
              type="date"
              value={spreadSheetDate}
              onChange={(e) => setSpreadSheetDate(e.target.value)}
              className="h-9 w-full sm:w-48"
            />
          </div>

          <div className="space-y-1 flex-1">
            <label className="text-xs font-bold text-gray-700 block">Filter by Photographer</label>
            <Select value={selectedPhotographer} onValueChange={setSelectedPhotographer}>
              <SelectTrigger className="h-9 w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Photographers</SelectItem>
                {photographers.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {combinedLogs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500 italic text-xs">
            No call log screenshots found for {spreadSheetDate} with the selected filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {combinedLogs.map((log) => (
            <Card key={log.id} className="overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
              <div className="relative aspect-[3/4] bg-gray-100 flex items-center justify-center border-b group overflow-hidden">
                <img 
                  src={log.fileUrl} 
                  alt={log.taskType} 
                  className="max-h-full max-w-full object-contain cursor-pointer"
                  onClick={() => {
                    window.open(log.fileUrl, '_blank');
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                    <Eye className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-3 space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">{log.photographerName}</span>
                  <span className="text-gray-400 font-medium">{log.date}</span>
                </div>
                {log.showroom && (
                  <div className="text-gray-600 font-semibold truncate">
                    Showroom: {log.showroom}
                  </div>
                )}
                <div className="pt-2 border-t mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Audit Task Type:</span>
                  <Badge className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    log.taskType === 'Morning Standup' 
                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200' 
                      : 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200'
                  }`}>
                    {log.taskType}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function ViewScreen() {
  const { user } = useAuth();
  const { dealerships, clusters, mappings, photographers, allUsers } = useConfig();
  const { isPhotographerOnLeave, leaves } = useLeave();
  const navigate = useNavigate();

  // Helper to determine payout model for a photographer on a given date
  const getPhotographerPayoutModel = (photographerId: string | undefined, dateStr: string | undefined): string => {
    if (!photographerId || !dateStr) return 'Percentage Based (10/30/50)';
    const photographer = allUsers.find(p => p.id === photographerId);
    if (!photographer) return 'Percentage Based (10/30/50)';
    
    const model = photographer.payout_model || 'PERCENTAGE';
    if (!photographer.fixed_start_date) {
      if (model === 'PERCENTAGE_15_DAILY') return 'Flat 15% Daily Settlement';
      if (model === 'FIXED') return 'Fixed Payout';
      return 'Percentage Based (10/30/50)';
    }
    
    // Check if within fixed window
    const inFixedWindow = dateStr >= photographer.fixed_start_date && 
      (!photographer.fixed_end_date || dateStr < photographer.fixed_end_date);
      
    if (inFixedWindow) {
      return 'Fixed Payout';
    }
    
    // Outside fixed window
    if (model === 'PERCENTAGE_15_DAILY') return 'Flat 15% Daily Settlement';
    return 'Percentage Based (10/30/50)';
  };

  const getPhotographerRawPayoutModel = (photographerId: string | undefined, dateStr: string | undefined): 'PERCENTAGE' | 'FIXED' | 'PERCENTAGE_15_DAILY' => {
    if (!photographerId || !dateStr) return 'PERCENTAGE';
    const photographer = allUsers.find(p => p.id === photographerId);
    if (!photographer) return 'PERCENTAGE';
    
    const model = photographer.payout_model || 'PERCENTAGE';
    if (!photographer.fixed_start_date) {
      return model;
    }
    
    // Check if within fixed window
    const inFixedWindow = dateStr >= photographer.fixed_start_date && 
      (!photographer.fixed_end_date || dateStr < photographer.fixed_end_date);
      
    if (inFixedWindow) {
      return 'FIXED';
    }
    
    return model;
  };

  const getPayableAmountAndLabel = (photographerId: string | undefined, dateStr: string | undefined, receivedAmount: number, rapidoCharge: number) => {
    const rawModel = getPhotographerRawPayoutModel(photographerId, dateStr);
    if (rawModel === 'PERCENTAGE_15_DAILY') {
      const amount = Math.max(0, Math.round((Number(receivedAmount || 0) - Number(rapidoCharge || 0)) * 0.15));
      return {
        label: 'Payable Amount (15%):',
        amount: amount,
        shortLabel: `Payable: ₹${amount}`,
      };
    } else {
      const amount = Math.round(Number(receivedAmount || 0) * 0.3);
      return {
        label: 'Payable Amount (30%):',
        amount: amount,
        shortLabel: `Payable: ₹${amount}`,
      };
    }
  };

  // DEBUG: Track render count
  const renderCount = React.useRef(0);
  renderCount.current++;
  console.log(`🎨 ViewScreen RENDER #${renderCount.current} - historyIndex will be updated below`);

  // V1 SPEC: Photographers see two tabs: Incentive Tracker + Spreadsheet
  // Admins see: Spreadsheet + Payment Gallery + Follow Gallery + Logs
  const [mainTab, setMainTab] = useState<'earnings' | 'data'>('data');

  // V1 SPEC: Admin View has 3 mutually exclusive modes:
  // 4. Logs View (admin audit trail)
  // 5. Portrait View (live_bookings)
  // V1 RULE: Photographers must NEVER see screenshot galleries (modes 2 & 3)
  const [viewMode, setViewMode] = useState<'spreadsheet' | 'audit' | 'logs' | 'portrait' | 'missed_send_update' | 'call_logs'>('spreadsheet');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [galleryViewMode, setGalleryViewMode] = useState<'single' | 'grid'>('single');
  const [loading, setLoading] = useState(true);

  // V1 SPEC: Gallery filters
  const [selectedPhotographer, setSelectedPhotographer] = useState<string>('all');

  const selectedPhotographerObj = React.useMemo(() => {
    if (!selectedPhotographer || selectedPhotographer === 'all') return null;
    return allUsers.find(p => p.id === selectedPhotographer);
  }, [allUsers, selectedPhotographer]);

  // V1 SPEC: Spreadsheet showroom filter (log of deliveries covered per showroom)
  const [selectedShowroom, setSelectedShowroom] = useState<string>('all');

  // V1 SPEC: Spreadsheet edit state (undo/redo support)
  const [editHistory, setEditHistory] = useState<Delivery[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [editingCell, setEditingCell] = useState<{ deliveryId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResults, setAuditResults] = useState<{
    missingUpdates: { userId: string; name: string; deliveryCount: number; leaveType?: string | null }[];
    reelBacklogs: { userId: string; name: string; taskCount: number }[];
  } | null>(null);
  const [showAuditDialog, setShowAuditDialog] = useState(false);

  // Add new row state
  const [newRowData, setNewRowData] = useState<{
    date: string;
    showroom_id: string;
    delivery_name: string;
    footage_link: string;
    reel_link: string;
    received_amount: string;
    customer_phone: string;
    rapido_charge: string;
    payment_screenshot: File | null;
    rapido_screenshot: File | null;
    assigned_user_id: string;
    payment_screenshot_date: string;
    payment_screenshot_time: string;
    payment_screenshot_amount: string;
    platform_payment_screenshot: File | null;
    platform_payment_amount: string;
    platform_payment_screenshot_date: string;
    platform_payment_screenshot_time: string;
    platform_payment_screenshot_amount: string;
    witness_phone: string;
    fraud_screenshot: File | null;
    fraud_call_log_screenshot: File | null;
    rapido_screenshot_date: string;
    rapido_screenshot_time: string;
    rapido_screenshot_amount: string;
    customer_call_log_screenshot: File | null;
    actual_amount_confirmed_by_customer: string;
  }>({
    date: '',
    showroom_id: '',
    delivery_name: '',
    footage_link: '',
    reel_link: '',
    received_amount: '',
    customer_phone: '',
    rapido_charge: '',
    payment_screenshot: null,
    rapido_screenshot: null,
    rapido_screenshot_date: '',
    rapido_screenshot_time: '',
    rapido_screenshot_amount: '',
    assigned_user_id: '',
    payment_screenshot_date: '',
    payment_screenshot_time: '',
    payment_screenshot_amount: '',
    platform_payment_screenshot: null,
    platform_payment_amount: '',
    platform_payment_screenshot_date: '',
    platform_payment_screenshot_time: '',
    platform_payment_screenshot_amount: '',
    witness_phone: '',
    fraud_screenshot: null,
    fraud_call_log_screenshot: null,
    customer_call_log_screenshot: null,
    actual_amount_confirmed_by_customer: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState<Set<string>>(new Set());
  const [isSyncingBulk, setIsSyncingBulk] = useState(false);
  
  // V9.0 Spreadsheet View Filtering
  const [spreadSheetDate, setSpreadSheetDate] = useState<string>(getOperationalDateString());
  const [showAllTime, setShowAllTime] = useState<boolean>(false);

  // V6.0 CONFLICT RESOLUTION
  const [conflictDelivery, setConflictDelivery] = useState<Delivery | null>(null);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);

  const [newRowStandupCall, setNewRowStandupCall] = useState<any>(null);

  useEffect(() => {
    const fetchNewRowStandupCall = async () => {
      if (!newRowData.assigned_user_id || !newRowData.date) {
        setNewRowStandupCall(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('standup_calls')
          .eq('photographer_id', newRowData.assigned_user_id)
          .eq('date', newRowData.date)
          .maybeSingle();
        if (!error) {
          setNewRowStandupCall(data);
        } else {
          setNewRowStandupCall(null);
        }
      } catch (err) {
        console.error('Error fetching new row standup call:', err);
        setNewRowStandupCall(null);
      }
    };
    fetchNewRowStandupCall();
  }, [newRowData.assigned_user_id, newRowData.date]);

  const [missedSendUpdateData, setMissedSendUpdateData] = useState<{
    photographerId: string;
    name: string;
    completedCount: number;
    totalCount: number;
    hasSentUpdate: boolean;
    leaveText: string | null;
  }[]>([]);
  const [missedSendUpdateLoading, setMissedSendUpdateLoading] = useState(false);
  const [enteredCounts, setEnteredCounts] = useState<Record<string, string>>({});

  // Super Admin & Handover workflow states
  const [handoverLogs, setHandoverLogs] = useState<any[]>([]);
  const [allHandoverLogs, setAllHandoverLogs] = useState<any[]>([]);
  const [adminUpdateSent, setAdminUpdateSent] = useState<boolean>(false);
  const [bountyBoardVerified, setBountyBoardVerified] = useState<boolean>(false);
  const [bountyBoardCount, setBountyBoardCount] = useState<number | null>(null);
  const [verifyingBountyBoard, setVerifyingBountyBoard] = useState<boolean>(false);
  const [allStandupCalls, setAllStandupCalls] = useState<any[]>([]);
  const [missedUpdateClosedPhotographers, setMissedUpdateClosedPhotographers] = useState<Set<string>>(new Set());
  const [sentUpdateUserIds, setSentUpdateUserIds] = useState<Set<string>>(new Set());
  const [confirmedAmounts, setConfirmedAmounts] = useState<Record<string, string>>({});

  const [task3CallLogFile, setTask3CallLogFile] = useState<File | null>(null);
  const [task3CallLogUrl, setTask3CallLogUrl] = useState<string>('');
  const [uploadingTask3CallLog, setUploadingTask3CallLog] = useState(false);

  useEffect(() => {
    setTask3CallLogUrl('');
    setTask3CallLogFile(null);
  }, [selectedPhotographer, spreadSheetDate]);

  const handleTask3CallLogChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTask3CallLog(true);
    try {
      const path = `handover_call_logs/${selectedPhotographer}_${spreadSheetDate}_${Date.now()}.jpg`;
      const url = await screenshotsDb.uploadScreenshotFile(file, path, supabase);
      setTask3CallLogUrl(url);
      setTask3CallLogFile(file);
      toast.success('Call log screenshot uploaded successfully!');
    } catch (err) {
      console.error('Failed to upload call log:', err);
      toast.error('Failed to upload call log screenshot');
    } finally {
      setUploadingTask3CallLog(false);
    }
  };

  const fetchHandoverAndSentLogs = async () => {
    if (!spreadSheetDate || !user) return;
    try {
      const client = supabase;
      const [year, month, day] = spreadSheetDate.split('-').map(Number);
      const start = new Date(year, month - 1, day - 1, 0, 0, 0).toISOString();
      const end = new Date(year, month - 1, day + 2, 23, 59, 59).toISOString();

      // Fetch logs for current selected date
      const { data: logs, error } = await client
        .from('log_events')
        .select('*')
        .in('type', ['ADMIN_AUDIT_HANDOVER_TO_SUPER_ADMIN', 'ADMIN_DAILY_AUDIT_UPDATE_SENT', 'ADMIN_AUDIT_MISSED_SEND_UPDATE_COMPLETED'])
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) throw error;

      // Filter events by operational date in JS
      const handovers = (logs || []).filter(le => 
        le.type === 'ADMIN_AUDIT_HANDOVER_TO_SUPER_ADMIN' && 
        le.metadata?.date === spreadSheetDate
      );

      const updateSent = (logs || []).some(le => 
        le.type === 'ADMIN_DAILY_AUDIT_UPDATE_SENT' && 
        le.metadata?.date === spreadSheetDate
      );

      setHandoverLogs(handovers);
      setAdminUpdateSent(updateSent);

      // Fetch missed-send-update closed tasks for this date
      const closedIds = new Set<string>(
        (logs || [])
          .filter(le => le.type === 'ADMIN_AUDIT_MISSED_SEND_UPDATE_COMPLETED' && le.metadata?.date === spreadSheetDate)
          .map((le: any) => le.metadata?.photographer_id as string)
          .filter(Boolean)
      );
      setMissedUpdateClosedPhotographers(closedIds);

      // Fetch all handovers from the past 14 days for the review queue
      const past14Days = new Date();
      past14Days.setDate(past14Days.getDate() - 14);
      
      const { data: allHandovers, error: allHandoversError } = await client
        .from('log_events')
        .select('*')
        .eq('type', 'ADMIN_AUDIT_HANDOVER_TO_SUPER_ADMIN')
        .gte('created_at', past14Days.toISOString());

      if (allHandoversError) throw allHandoversError;
      setAllHandoverLogs(allHandovers || []);
    } catch (err) {
      console.error('Failed to fetch handover logs:', err);
    }
  };

  useEffect(() => {
    if ((viewMode === 'audit' || viewMode === 'call_logs') && spreadSheetDate && user) {
      fetchHandoverAndSentLogs();
      fetchMissedSendUpdateData(spreadSheetDate);
      
      // Fetch all standup calls for the selected date
      const fetchStandupCalls = async () => {
        try {
          const { data, error } = await supabase
            .from('standup_calls')
            .eq('date', spreadSheetDate);
          if (!error && data) {
            setAllStandupCalls(data);
          }
        } catch (err) {
          console.error('Failed to fetch standup calls:', err);
        }
      };
      fetchStandupCalls();
    }
  }, [spreadSheetDate, viewMode, user]);

  const handleVerifyBountyBoard = async () => {
    setVerifyingBountyBoard(true);
    try {
      const client = supabase;
      const { data, error } = await client
        .from('reel_tasks')
        .select('*')
        .eq('is_post_it', true)
        .eq('status', 'PENDING');
        
      if (error) throw error;
      
      // Unclaimed: assigned_user_id === original_user_id or null, and original user is active
      const activeUserIds = new Set(allUsers.filter(u => u.active).map(u => u.id));
      const unclaimed = (data || []).filter(t => {
        const isUnclaimed = t.assigned_user_id === t.original_user_id || !t.assigned_user_id;
        const isOriginalUserActive = !t.original_user_id || activeUserIds.has(t.original_user_id);
        return isUnclaimed && isOriginalUserActive;
      });
      
      setBountyBoardCount(unclaimed.length);
      if (unclaimed.length === 0) {
        setBountyBoardVerified(true);
        toast.success('Bounty board verification passed! No unclaimed bounties found.');
      } else {
        setBountyBoardVerified(false);
        toast.error(`Verification failed: ${unclaimed.length} unclaimed bounty reels are still pending.`);
      }
    } catch (err) {
      console.error('Failed to verify bounty board:', err);
      toast.error('Failed to verify bounty board');
    } finally {
      setVerifyingBountyBoard(false);
    }
  };

  const handleSendAdminDailyUpdate = async () => {
    if (!spreadSheetDate || !user) return;
    try {
      const client = supabase;
      const { error } = await client.from('log_events').insert({
        type: 'ADMIN_DAILY_AUDIT_UPDATE_SENT',
        actor_user_id: user.id,
        target_id: user.id,
        metadata: {
          date: spreadSheetDate,
          admin_name: user.name
        }
      });
      if (error) throw error;
      toast.success('Daily audit update sent successfully!');
      setAdminUpdateSent(true);
    } catch (err) {
      console.error('Failed to send admin daily update:', err);
      toast.error('Failed to send daily update');
    }
  };

  const handleHandoverToSuperAdmin = async (taskType: 'STANDUP' | 'FRAUD' | 'DELIVERIES' | 'MISSED_UPDATE') => {
    if (!selectedPhotographer || !spreadSheetDate || !user) return;
    try {
      const client = supabase;
      const photographerName = cityIsolatedPhotographers.find(p => p.id === selectedPhotographer)?.name || 'Unknown';
      const { error } = await client.from('log_events').insert({
        type: 'ADMIN_AUDIT_HANDOVER_TO_SUPER_ADMIN',
        actor_user_id: user.id,
        target_id: selectedPhotographer,
        metadata: {
          date: spreadSheetDate,
          photographer_name: photographerName,
          task_type: taskType
        }
      });
      if (error) throw error;
      toast.success(`${taskType === 'STANDUP' ? 'Standup' : taskType === 'FRAUD' ? 'Fraud' : taskType === 'MISSED_UPDATE' ? 'Missed Update' : 'Deliveries'} task handed over to Super Admin`);
      fetchHandoverAndSentLogs();
    } catch (err) {
      console.error('Failed to handover task:', err);
      toast.error('Failed to handover task');
    }
  };

  const isPhotographerAuditCompleted = (photographerId: string, photographerDeliveries: Delivery[], standupCall: any) => {
    if (!standupCall) return false;
    if (standupCall.status === 'LEAVE') return true;

    const doneDeliveries = photographerDeliveries.filter(d => d.status === 'DONE');
    const uniqueShowrooms = Array.from(new Set(doneDeliveries.map(d => getShowroomCode(d.showroom_code))));
    
    for (const showroomCode of uniqueShowrooms) {
      const showroomDeliveries = doneDeliveries.filter(d => getShowroomCode(d.showroom_code) === showroomCode);
      const verified = showroomDeliveries.some(d => 
        !!d.witness_phone && 
        screenshots.some(s => s.delivery_id === d.id && s.type === 'FRAUD_DETECTION' && !s.deleted_at)
      );
      if (!verified) return false;
    }

    for (const d of doneDeliveries) {
      const isCustomerPaid = d.payment_type === 'CUSTOMER_PAID';
      const photographerObj = allUsers.find(p => p.id === photographerId);
      const is15PercentModel = photographerObj && getPhotographerRawPayoutModel(photographerId, d.date) === 'PERCENTAGE_15_DAILY';
      const hasRapido = d.rapido_charge != null && d.rapido_charge > 0;

      const isCustomerPayVerified = !isCustomerPaid || (!!d.payment_screenshot_date && !!d.payment_screenshot_time && !!d.payment_screenshot_amount);
      const isPlatformPayVerified = !is15PercentModel || !isCustomerPaid || (!!d.platform_payment_screenshot_date && !!d.platform_payment_screenshot_time && !!d.platform_payment_screenshot_amount);
      const isRapidoVerified = !hasRapido || (!!d.rapido_screenshot_date && !!d.rapido_screenshot_time && !!d.rapido_screenshot_amount);

      if (!isCustomerPayVerified || !isPlatformPayVerified || !isRapidoVerified) {
        return false;
      }
    }

    return true;
  };

  const [currentStandupCall, setCurrentStandupCall] = useState<any>(null);
  const [standupLoading, setStandupLoading] = useState(false);
  const [standupForm, setStandupForm] = useState<{
    status: 'CONFIRMED' | 'LEAVE';
    confirmed_count: string;
    screenshotFile: File | null;
    previewUrl: string;
    submitting: boolean;
  }>({
    status: 'CONFIRMED',
    confirmed_count: '',
    screenshotFile: null,
    previewUrl: '',
    submitting: false
  });
  
  const handleStandupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setStandupForm(prev => ({
        ...prev,
        screenshotFile: file,
        previewUrl: URL.createObjectURL(file)
      }));
    }
  };
  
  useEffect(() => {
    if (viewMode === 'audit' && selectedPhotographer && selectedPhotographer !== 'all' && spreadSheetDate) {
      const loadStandup = async () => {
        setStandupLoading(true);
        try {
          const call = await standupDb.getStandupCall(selectedPhotographer, spreadSheetDate);
          setCurrentStandupCall(call);
        } catch (err) {
          console.error('Failed to load standup call:', err);
        } finally {
          setStandupLoading(false);
        }
      };
      loadStandup();
    } else {
      setCurrentStandupCall(null);
    }
  }, [selectedPhotographer, spreadSheetDate, viewMode]);

  const handleNudgePhotographer = async (photographerId: string, name: string, pendingCount: number) => {
    try {
      const title = '⚠️ Action Required: Day End Update';
      const body = `You have ${pendingCount} deliveries pending today. Please submit "Send Update" immediately.`;

      await notificationsDb.createNotification({
        user_id: photographerId,
        title,
        body,
        type: 'DAY_CLOSURE'
      });

      const { sendPushToUser } = await import('../lib/db/push');
      await sendPushToUser(photographerId, { title, body });

      toast.success(`Nudged ${name} successfully!`);
    } catch (error) {
      console.error('Failed to nudge photographer:', error);
      toast.error('Failed to send nudge');
    }
  };

  const handleCloseMissedSendUpdateTask = async (p: any) => {
    try {
      const count = parseInt(enteredCounts[p.photographerId]);
      const { error } = await supabase.from('log_events').insert({
        type: 'ADMIN_AUDIT_MISSED_SEND_UPDATE_COMPLETED',
        actor_user_id: user?.id,
        metadata: {
          photographer_id: p.photographerId,
          date: spreadSheetDate,
          reported_count: count,
          saved_count: p.totalCount
        }
      });
      if (error) throw error;
      
      toast.success(`Audit task for ${p.name} completed successfully`);
      
      // Update local closed set immediately so Send Update button reacts
      setMissedUpdateClosedPhotographers(prev => new Set([...prev, p.photographerId]));
      
      // Remove from list locally
      setMissedSendUpdateData(prev => prev.filter(item => item.photographerId !== p.photographerId));
    } catch (err) {
      console.error('Failed to close audit task:', err);
      toast.error('Failed to close audit task');
    }
  };

  // V1 SPEC: Only ADMIN can access screenshot galleries
  const isAdmin = user?.role === 'ADMIN';

  // DEBUG: Log current state values on every render
  console.log(`📊 STATE VALUES: historyIndex=${historyIndex}, editHistory.length=${editHistory.length}, deliveries.length=${deliveries.length}`);

  // Helper function to format showroom display as "Dealership + Cluster"
  const getShowroomDisplayName = (dealershipId: string): string => {
    const dealership = dealerships.find(d => d.id === dealershipId);
    if (!dealership) return 'Unknown Dealership';

    const mapping = mappings.find(m => m.dealershipId === dealershipId);
    const cluster = mapping ? clusters.find(c => c.id === mapping.clusterId) : null;

    return cluster ? `${dealership.name} (${cluster.name})` : dealership.name;
  };

  // V6.0 CITY ISOLATION: Memoized filtered lists based on Cluster geographic anchor
  const cityIsolatedClusters = React.useMemo(() => {
    if (!user || user.role !== 'ADMIN' || !user.city) return clusters;
    return clusters.filter(c => (c as any).city === user.city);
  }, [clusters, user]);

  const allowedClusterIds = React.useMemo(() => new Set(cityIsolatedClusters.map(c => c.id)), [cityIsolatedClusters]);

  const cityIsolatedMappings = React.useMemo(() => {
    if (!user || user.role !== 'ADMIN' || !user.city || !mappings) return mappings;
    return mappings.filter(m => allowedClusterIds.has(m.clusterId));
  }, [mappings, allowedClusterIds, user]);

  const allowedDealershipIds = React.useMemo(() => new Set(cityIsolatedMappings.map(m => m.dealershipId)), [cityIsolatedMappings]);
  const allowedPhotographerIds = React.useMemo(() => new Set(cityIsolatedMappings.map(m => m.photographerId)), [cityIsolatedMappings]);

  const cityIsolatedDealerships = React.useMemo(() => {
    if (!user || user.role !== 'ADMIN' || !user.city) return dealerships;
    return dealerships.filter(d => allowedDealershipIds.has(d.id));
  }, [dealerships, allowedDealershipIds, user]);

  const cityIsolatedPhotographers = React.useMemo(() => {
    if (!user || user.role !== 'ADMIN' || !user.city) return photographers;
    return photographers.filter(p => allowedPhotographerIds.has(p.id));
  }, [photographers, allowedPhotographerIds, user]);

  const photographerStatusList = React.useMemo(() => {
    if (!spreadSheetDate) return [];
    
    // For calculating checklist completeness, only active photographers for this date are relevant
    const targetPhotographers = cityIsolatedPhotographers.filter(p => p.active);
    
    return targetPhotographers.map(p => {
      const pDeliveries = deliveries.filter(d => d.assigned_user_id === p.id && d.date === spreadSheetDate);
      const standupCall = allStandupCalls.find(c => c.photographer_id === p.id);
      
      // A photographer's audits are complete if:
      // - Either ALL 3 tasks are completed (standup verified, fraud verified, deliveries verified)
      // - OR any task that is not completed is handed over to the super admin
      
      const isStandupHandedOver = handoverLogs.some(l => l.target_id === p.id && l.metadata?.task_type === 'STANDUP');
      const isFraudHandedOver = handoverLogs.some(l => l.target_id === p.id && l.metadata?.task_type === 'FRAUD');
      const isDeliveriesHandedOver = handoverLogs.some(l => l.target_id === p.id && l.metadata?.task_type === 'DELIVERIES');
      const isMissedUpdateHandedOver = handoverLogs.some(l => l.target_id === p.id && l.metadata?.task_type === 'MISSED_UPDATE');

      const hasSentUpdate = sentUpdateUserIds.has(p.id);

      // Standup Task status
      const standupDone = isStandupHandedOver || !!standupCall;

      // Fraud Task status — if update was completely missed, skip fraud audits
      const doneDeliveries = pDeliveries.filter(d => d.status === 'DONE');
      const uniqueShowrooms = Array.from(new Set(doneDeliveries.map(d => getShowroomCode(d.showroom_code))));
      
      const customerPaidDeliveriesForPhotographer = doneDeliveries.filter(d => d.payment_type === 'CUSTOMER_PAID');
      let fraudDone = !hasSentUpdate || isFraudHandedOver || (uniqueShowrooms.length === 0 && customerPaidDeliveriesForPhotographer.length === 0);
      if (hasSentUpdate && !isFraudHandedOver) {
        let allVerified = true;
        // 1. Witness verification (Task 2A)
        if (uniqueShowrooms.length > 0) {
          for (const showroomCode of uniqueShowrooms) {
            const showroomDeliveries = doneDeliveries.filter(d => getShowroomCode(d.showroom_code) === showroomCode);
            const verified = showroomDeliveries.some(d => 
              !!d.witness_phone && 
              screenshots.some(s => s.delivery_id === d.id && s.type === 'FRAUD_DETECTION' && !s.deleted_at)
            );
            if (!verified) {
              allVerified = false;
              break;
            }
          }
        }
        // 2. Customer paid call log verification (Task 2B)
        if (allVerified && customerPaidDeliveriesForPhotographer.length > 0) {
          for (const d of customerPaidDeliveriesForPhotographer) {
            const callLogScr = screenshots.find(s => s.delivery_id === d.id && s.type.startsWith('CUSTOMER_CALL_LOG') && !s.deleted_at);
            if (!callLogScr) {
              allVerified = false;
              break;
            }
            const confirmedAmount = callLogScr.type.split(':')[1] || '';
            const isMatch = parseFloat(confirmedAmount) === parseFloat(d.received_amount || '0');
            if (!isMatch) {
              allVerified = false;
              break;
            }
          }
        }
        fraudDone = allVerified;
      }

      // Deliveries Task status — if update was completely missed, skip deliveries audits
      let deliveriesDone = !hasSentUpdate || isDeliveriesHandedOver || doneDeliveries.length === 0;
      if (hasSentUpdate && !isDeliveriesHandedOver && doneDeliveries.length > 0) {
        let allVerified = true;
        for (const d of doneDeliveries) {
          const isCustomerPaid = d.payment_type === 'CUSTOMER_PAID';
          const photographerObj = allUsers.find(u => u.id === p.id);
          const is15PercentModel = photographerObj && getPhotographerRawPayoutModel(p.id, d.date) === 'PERCENTAGE_15_DAILY';
          const hasRapido = d.rapido_charge != null && d.rapido_charge > 0;

          const isCustomerPayVerified = !isCustomerPaid || (!!d.payment_screenshot_date && !!d.payment_screenshot_time && !!d.payment_screenshot_amount);
          const isPlatformPayVerified = !is15PercentModel || !isCustomerPaid || (!!d.platform_payment_screenshot_date && !!d.platform_payment_screenshot_time && !!d.platform_payment_screenshot_amount);
          const isRapidoVerified = !hasRapido || (!!d.rapido_screenshot_date && !!d.rapido_screenshot_time && !!d.rapido_screenshot_amount);

          if (!isCustomerPayVerified || !isPlatformPayVerified || !isRapidoVerified) {
            allVerified = false;
            break;
          }
        }
        deliveriesDone = allVerified;
      }

      // Missed Send Update Task status — only relevant if this photographer appears in the missed list
      const missedUpdateEntry = missedSendUpdateData.find(m => m.photographerId === p.id);
      const isMissedUpdateDone = !missedUpdateEntry || missedUpdateClosedPhotographers.has(p.id) || isMissedUpdateHandedOver;

      const completed = standupDone && fraudDone && deliveriesDone && isMissedUpdateDone;

      return {
        id: p.id,
        name: p.name,
        completed,
        isStandupHandedOver,
        isFraudHandedOver,
        isDeliveriesHandedOver,
        isMissedUpdateHandedOver,
        isMissedUpdateDone,
        missedUpdateEntry: missedUpdateEntry || null,
        hasSentUpdate
      };
    });
  }, [cityIsolatedPhotographers, deliveries, allStandupCalls, handoverLogs, spreadSheetDate, screenshots, allUsers, missedSendUpdateData, missedUpdateClosedPhotographers, sentUpdateUserIds]);

  const allPhotographersCleared = React.useMemo(() => {
    return photographerStatusList.length > 0 && photographerStatusList.every(p => p.completed);
  }, [photographerStatusList]);

  // Shared function to fetch missed send update data (called from both audit and missed_send_update tabs)
  const fetchMissedSendUpdateData = async (dateStr: string) => {
    if (!user) return;
    setMissedSendUpdateLoading(true);
    try {
      // 1. Get active photographers
      const activePhotographers = cityIsolatedPhotographers.filter(p => p.active === true);
      
      // 2. Fetch log events for SEND_UPDATE_COMPLETED and ADMIN_AUDIT_MISSED_SEND_UPDATE_COMPLETED around dateStr
      const [year, month, day] = dateStr.split('-').map(Number);
      const start = new Date(year, month - 1, day - 1, 0, 0, 0);
      const end = new Date(year, month - 1, day + 2, 23, 59, 59);
      
      const { data: logs, error: logsError } = await supabase
        .from('log_events')
        .select('*')
        .in('type', ['SEND_UPDATE_COMPLETED', 'ADMIN_AUDIT_MISSED_SEND_UPDATE_COMPLETED'])
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
        
      if (logsError) throw logsError;
      
      // Filter logs by operational date in JS
      const sentUpdateUserIdsSet = new Set(
        (logs || [])
          .filter(le => le.type === 'SEND_UPDATE_COMPLETED' && getOperationalDateString(new Date(le.created_at)) === dateStr)
          .map(le => le.actor_user_id)
      );
      setSentUpdateUserIds(sentUpdateUserIdsSet);

      const auditedUserIds = new Set(
        (logs || [])
          .filter(le => le.type === 'ADMIN_AUDIT_MISSED_SEND_UPDATE_COMPLETED' && getOperationalDateString(new Date(le.created_at)) === dateStr)
          .map(le => le.metadata?.photographer_id)
      );
      
      // 3. Fetch leaves for dateStr
      const { data: leaves, error: leavesError } = await supabase
        .from('leaves')
        .select('*')
        .eq('date', dateStr);
        
      if (leavesError) throw leavesError;

      // 4. Fetch all deliveries for dateStr
      const { data: dayDeliveriesRaw, error: deliveriesError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('date', dateStr)
        .is('deleted_at', null);

      if (deliveriesError) throw deliveriesError;
      
      // 5. Process each photographer
      const results = activePhotographers.map(p => {
        const dayDeliveries = (dayDeliveriesRaw || []).filter(d => d.assigned_user_id === p.id);
        const completedCount = dayDeliveries.filter(d => d.status === 'DONE').length;
        const totalCount = dayDeliveries.length;
        const hasSentUpdate = sentUpdateUserIdsSet.has(p.id);
        const isAuditClosed = auditedUserIds.has(p.id);
        
        const userLeaves = (leaves || []).filter(l => l.photographer_id === p.id);
        let leaveText = null;
        if (userLeaves.length >= 2) {
          leaveText = 'Full Day Leave';
        } else if (userLeaves.length === 1) {
          leaveText = userLeaves[0].half === 'FIRST_HALF' ? '1st Half Leave' : '2nd Half Leave';
        }
        
        return { photographerId: p.id, name: p.name, completedCount, totalCount, hasSentUpdate, isAuditClosed, leaveText };
      });
      
      // 6. Filter: missed update or 0 completions AND not yet closed
      const filteredResults = results.filter(r => 
        !r.isAuditClosed && (r.completedCount === 0 || !r.hasSentUpdate)
      );
      
      setMissedSendUpdateData(filteredResults);

      // Also sync closed IDs into local state so Send Update gate is accurate
      setMissedUpdateClosedPhotographers(new Set(
        (logs || [])
          .filter(le => le.type === 'ADMIN_AUDIT_MISSED_SEND_UPDATE_COMPLETED' && getOperationalDateString(new Date(le.created_at)) === dateStr)
          .map((le: any) => le.metadata?.photographer_id as string)
          .filter(Boolean)
      ));
    } catch (err) {
      console.error('Failed to fetch missed send update audit data:', err);
      if (viewMode === 'missed_send_update') toast.error('Failed to load audit results');
    } finally {
      setMissedSendUpdateLoading(false);
    }
  };

  // Missed Send Update / Covered 0 Delivery fetcher — triggered by tab switch or date change
  useEffect(() => {
    if (viewMode !== 'missed_send_update' || !user) return;
    fetchMissedSendUpdateData(spreadSheetDate);
  }, [viewMode, spreadSheetDate, cityIsolatedPhotographers, user]);

  useEffect(() => {
    console.log('🚀 ViewScreen mounted - CODE VERSION: 2024-01-20-DEBUG');
    loadData();
  }, []);

  // V1 SPEC: Set default showroom for photographers
  useEffect(() => {
    // Only apply for photographers who haven't manually changed from 'all' yet
    if (user && !isAdmin && mappings.length > 0 && selectedShowroom === 'all') {
      const primaryMapping = mappings.find(m => m.photographerId === user.id && m.mappingType === 'PRIMARY');
      if (primaryMapping) {
        console.log(`🎯 ViewScreen: Setting default showroom for ${user.name} -> ${primaryMapping.dealershipId}`);
        setSelectedShowroom(primaryMapping.dealershipId);
      }
    }
  }, [user, isAdmin, mappings, selectedShowroom]);

  // DEBUG: Log whenever edit history changes
  useEffect(() => {
    console.log('📊 Edit History Changed - historyIndex:', historyIndex, 'editHistory.length:', editHistory.length);
    console.log('   Can Undo:', historyIndex > 0, 'Can Redo:', historyIndex < editHistory.length - 1);
  }, [editHistory, historyIndex]);

  const handleRunAudit = async () => {
    setAuditLoading(true);
    try {
      const today = getOperationalDateString();
      const client = supabase;
      console.log('🔍 [Audit] Requesting server-side audit for date:', today);

      // Call the server-side RPC for enterprise-scale performance
      const { data, error } = await (client as any).rpc('run_system_audit', { target_date: today });

      if (error) throw error;

      console.log('📊 [Audit] Server-side audit results received:', data);
      
      setAuditResults({
        missingUpdates: (data as any).missingUpdates || [],
        reelBacklogs: (data as any).reelBacklogs || [],
      });
      setShowAuditDialog(true);
    } catch (error) {
      console.error('Audit failed:', error);
      toast.error('Failed to run system audit');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleNudgeAll = async () => {
    if (!auditResults) return;

    const nudgeCount = auditResults.missingUpdates.length + auditResults.reelBacklogs.length;
    if (nudgeCount === 0) {
      toast.info('No photographers to nudge!');
      return;
    }

    try {
      const promises: Promise<any>[] = [];

      // 1. Nudge for Send Update
      auditResults.missingUpdates.forEach(userNotif => {
        const title = '⚠️ Action Required: Day End Update';
        const body = `You have ${userNotif.deliveryCount} deliveries pending today. Please submit "Send Update" immediately.`;

        // In-app notification
        promises.push(notificationsDb.createNotification({
          user_id: userNotif.userId,
          title,
          body,
          type: 'DAY_CLOSURE'
        }));

        // Background Push Notification
        import('../lib/db/push').then(({ sendPushToUser }) => {
          sendPushToUser(userNotif.userId, { title, body });
        });
      });

      // 2. Nudge for Reel Backlog
      auditResults.reelBacklogs.forEach(userNotif => {
        const title = '🎬 Reel Backlog Alert';
        const body = `You have ${userNotif.taskCount} unresolved reels from 2+ days ago. Please resolve them now.`;

        // In-app notification
        promises.push(notificationsDb.createNotification({
          user_id: userNotif.userId,
          title,
          body,
          type: 'REEL_BACKLOG'
        }));

        // Background Push Notification
        import('../lib/db/push').then(({ sendPushToUser }) => {
          sendPushToUser(userNotif.userId, { title, body });
        });
      });

      await Promise.all(promises);
      toast.success(`Successfully nudged ${nudgeCount} photographers!`);
      setShowAuditDialog(false);
    } catch (error) {
      console.error('Nudge failed:', error);
      toast.error('Failed to send nudges');
    }
  };

  const loadData = async (forceShowroom?: string) => {
    const showroomId = forceShowroom !== undefined ? forceShowroom : selectedShowroom;
    console.log(`🔄 [ViewScreen] loadData(showroomId: ${showroomId}) started...`);
    setLoading(true);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Data loading timed out after 25 seconds')), 25000)
    );

    try {
      await Promise.race([
        (async () => {
          const client = supabase;

          // 1. Prepare filters for deliveries
          const filters: any = { status: 'DONE' };

          // Apply date filter at the database level if not showing all time
          if (!showAllTime && spreadSheetDate) {
            filters.date = spreadSheetDate;
          }
          
          // V5.5: Always filter by showroom if one is selected to save memory/bandwidth
          if (showroomId && showroomId !== 'all') {
            const dealership = cityIsolatedDealerships.find(d => d.id === showroomId);
            if (dealership) {
              filters.showroomCode = getShowroomCode(dealership.name);
            }
          } else if (user?.role === 'ADMIN' && user.city) {
            // V6.0: If 'all' selected but is a city-admin, restrict fetch to their city's showrooms
            const cityShowroomCodes = cityIsolatedDealerships.map(d => getShowroomCode(d.name));
            if (cityShowroomCodes.length > 0) {
              filters.showroomCodes = cityShowroomCodes;
            }
          }

          // 2. Fetch deliveries matching filter
          const doneDeliveries = await deliveriesDb.getDeliveries(filters, client);

          // 3. Fetch screenshots (Admin View Only) - V5.5 SCALABILITY FIX
          let realScreenshots: any[] = [];
          
          if (user?.role === 'ADMIN') {
            const { getScreenshotsByDeliveries, getAllScreenshots } = await import('../lib/db/screenshots');
            
            // If showAllTime is false, or if a showroom is selected, only fetch screenshots for the loaded deliveries.
            // This avoids fetching all historical screenshots.
            if ((!showAllTime || (showroomId && showroomId !== 'all')) && doneDeliveries.length > 0) {
              const deliveryIds = doneDeliveries.map(d => d.id);
              const deliveryScreenshots = await getScreenshotsByDeliveries(deliveryIds).then(map => Array.from(map.values()).flat());
              realScreenshots = [...deliveryScreenshots];
            } else if (showAllTime) {
              realScreenshots = await getAllScreenshots();
            }

            // Also fetch showroom-level screenshots (like FRAUD_DETECTION where delivery_id is null)
            let showroomQuery = client.from('screenshots').select('*').is('deleted_at', null).is('delivery_id', null);
            
            if (showroomId && showroomId !== 'all') {
              const dealership = cityIsolatedDealerships.find(d => d.id === showroomId);
              if (dealership) {
                showroomQuery = showroomQuery.eq('showroom_code', getShowroomCode(dealership.name));
              }
            }
            
            if (!showAllTime && spreadSheetDate) {
              const startOfDay = `${spreadSheetDate}T00:00:00.000Z`;
              const endOfDay = `${spreadSheetDate}T23:59:59.999Z`;
              showroomQuery = showroomQuery.gte('uploaded_at', startOfDay).lte('uploaded_at', endOfDay);
            } else {
              showroomQuery = showroomQuery.limit(500);
            }

            const { data: showroomScreenshots, error: showroomError } = await showroomQuery;
            if (showroomError) {
              console.error('Error fetching showroom screenshots:', showroomError);
            } else if (showroomScreenshots) {
              const mapped = showroomScreenshots.map((row: any) => ({
                id: row.id,
                delivery_id: row.delivery_id,
                showroom_code: row.showroom_code,
                user_id: row.user_id,
                type: row.type,
                file_url: row.file_url,
                thumbnail_url: row.thumbnail_url,
                uploaded_at: row.uploaded_at,
                deleted_at: row.deleted_at || undefined,
              }));
              realScreenshots = [...realScreenshots, ...mapped];
            }
          }

          // V6.0 CITY ISOLATION (Gallery): Filter screenshots to only show those from photographers in the admin's city
          if (user?.role === 'ADMIN' && user.city) {
            const cityPhotographerIds = new Set(cityIsolatedPhotographers.map(p => p.id));
            realScreenshots = realScreenshots.filter(s => {
              if (cityPhotographerIds.has(s.user_id)) {
                return true;
              }
              if (s.delivery_id) {
                const delivery = doneDeliveries.find(d => d.id === s.delivery_id);
                return delivery && cityPhotographerIds.has(delivery.assigned_user_id || '');
              }
              return false;
            });
            console.log(`🖼️ [City Isolation] Gallery filtered to ${realScreenshots.length} screenshots for city ${user.city}.`);
          }
          setScreenshots(realScreenshots);

          // 4. Ensure metadata resolution for screenshots
          const screenshotDeliveryIds = Array.from(new Set(realScreenshots.map(s => s.delivery_id).filter(Boolean)));
          const knownIds = new Set(doneDeliveries.map(d => d.id));
          const missingIds = screenshotDeliveryIds.filter(id => id && !knownIds.has(id));

          let extraDeliveries: Delivery[] = [];
          if (missingIds.length > 0) {
            extraDeliveries = await deliveriesDb.getDeliveriesByIds(missingIds, client);
          }

          const uniqueDeliveries = Array.from(new Map([...doneDeliveries, ...extraDeliveries].map(d => [d.id, d])).values());

          setDeliveries(uniqueDeliveries);
          setEditHistory([uniqueDeliveries]);
          setHistoryIndex(0);
        })(),
        timeoutPromise
      ]);
      console.log('✅ [ViewScreen] Data loaded successfully');
    } catch (err) {
      console.error('❌ [ViewScreen] loadData failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // V5.5 Scalability: Reload data when showroom, date, or showAllTime selection changes
  useEffect(() => {
    if (user) {
      console.log(`🎯 Filters changed (showroom: ${selectedShowroom}, date: ${spreadSheetDate}, showAllTime: ${showAllTime}), reloading data...`);
      loadData(selectedShowroom);
    }
  }, [selectedShowroom, user?.id, spreadSheetDate, showAllTime]);

  // V1 SPEC: Refresh data when switching to spreadsheet view to pick up reel link changes
  // Use a ref to track previous viewMode to only load when actually switching
  const prevViewMode = React.useRef<string | null>(null);
  useEffect(() => {
    console.log('📍 viewMode useEffect - viewMode:', viewMode, 'prevViewMode:', prevViewMode.current);
    if (viewMode === 'spreadsheet' && prevViewMode.current !== null && prevViewMode.current !== 'spreadsheet') {
      console.log('🔄 Triggering loadData because switched TO spreadsheet');
      loadData();
    }
    prevViewMode.current = viewMode;
  }, [viewMode]);

  // V1 CRITICAL: Enforce admin-only access for screenshot galleries
  // If non-admin attempts to access payment/follow views, redirect to spreadsheet

  // V1 SPEC: Memoized filtered deliveries for both Table and CSV Export
  const filteredDeliveries = React.useMemo(() => {
    return deliveries.filter(d => {
      // V1 SPEC: Spreadsheet shows DONE deliveries AND Deadlocked (REJECTED_BY_ALL) deliveries
      if (d.status !== 'DONE' && (d as any).decision_state !== 'REJECTED_BY_ALL') return false;

      // V9.0: Spreadsheet Date Filtering (Default to Today)
      if (!showAllTime && spreadSheetDate) {
        if (d.date !== spreadSheetDate) return false;
      }

      // V6.0 CITY ISOLATION: Always filter by admin's city if role is ADMIN
      if (user?.role === 'ADMIN' && user.city) {
        const deliveryShowroomCode = getShowroomCode(d.showroom_code);
        const isFromCity = cityIsolatedDealerships.some(deal => getShowroomCode(deal.name) === deliveryShowroomCode);
        if (!isFromCity) return false;
      }

      // Apply showroom filter (Now strictly Dealership ID)
      if (selectedShowroom !== 'all') {
        const dealership = cityIsolatedDealerships.find(d => d.id === selectedShowroom);
        if (dealership) {
          const targetCode = getShowroomCode(dealership.name);
          // V21 FIX: Use raw showroom_code from DB, no need to re-process via getShowroomCode
          const currentCode = d.showroom_code;
          if (currentCode !== targetCode) return false;
        }
      }
      return true;
    });
  }, [deliveries, selectedShowroom, cityIsolatedDealerships, user, spreadSheetDate, showAllTime]);

  const handleExportCSV = () => {
    const csv = [
      ['Date', 'Footage Link', 'Reel Link', 'Photographer Name', 'Amount Received', 'Phone Number', 'Rapido Charge'].join(','),
      ...filteredDeliveries.map(d => {
        const photographer = allUsers.find(p => p.id === d.assigned_user_id);
        return [
          d.date,
          d.footage_link || '',
          (d as any).reel_link || '',
          photographer?.name || 'Unassigned',
          d.received_amount || '',
          d.customer_phone || '',
          d.rapido_charge || 0
        ].map(val => `"${val}"`).join(','); // Wrap in quotes to handle commas in links if any
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deliveries-${getOperationalDateString()}${selectedShowroom !== 'all' ? '-filtered' : ''}.csv`;
    a.click();

    toast.success(`Exported ${filteredDeliveries.length} rows to CSV`);
  };

  const handleDeleteScreenshot = async (screenshotId: string) => {
    await simulateApiDelay(300);
    // V1 SPEC: Screenshot deletion is AUDIT-ONLY and fully decoupled from delivery state machine
    // - Marks screenshot as deleted (soft delete for audit trail in database)
    // - PERMANENTLY REMOVES screenshot from binary storage (S3/CDN/etc)
    // - Does NOT reopen tasks
    // - Does NOT affect delivery state or status
    // - Does NOT affect spreadsheet data
    // - Does NOT affect SEND UPDATE status
    // - Admin-only operation (photographers cannot delete screenshots)
    setScreenshots(prev => prev.map(s =>
      s.id === screenshotId
        ? { ...s, deleted_at: new Date().toISOString() }
        : s
    ));
    toast.success('Screenshot permanently deleted from storage (audit-only action)');
  };

  // V1 SPEC: Undo/Redo handlers for spreadsheet edits
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setDeliveries(editHistory[historyIndex - 1]);
      toast.success('Undo successful');
    }
  };

  const handleRedo = () => {
    if (historyIndex < editHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setDeliveries(editHistory[historyIndex + 1]);
      toast.success('Redo successful');
    }
  };

  // V1 SPEC: Cell edit handlers (Admin + Photographer can edit)
  const handleStartEdit = (deliveryId: string, field: string, currentValue: string) => {
    setEditingCell({ deliveryId, field });
    setEditValue(currentValue || '');
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;

    // V11.0: Duplicate Link Validation for Footage Links
    if (editingCell.field === 'footage_link' && editValue && editValue.trim() !== '') {
      try {
        const currentDelivery = deliveries.find(d => d.id === editingCell.deliveryId);
        if (currentDelivery) {
          const duplicate = await deliveriesDb.checkDuplicateFootageLink(
            editValue, 
            currentDelivery.showroom_code, 
            editingCell.deliveryId
          );
          if (duplicate) {
            toast.error(`Duplicate link detected! This link is already used for ${duplicate.delivery_name}.`);
            return;
          }
        }
      } catch (error) {
        console.error('Duplicate check failed:', error);
      }
    }

    const oldDelivery = deliveries.find(d => d.id === editingCell.deliveryId);
    const photographerForSig = allUsers.find(p => p.id === oldDelivery?.assigned_user_id);
    const oldSignature = oldDelivery ? getDeliverySignature(oldDelivery, photographerForSig?.name || '') : null;

    // V1 FIX: Persist changes to DB immediately
    try {
      const client = supabase;

      if (editingCell.field === 'reel_link') {
        // 1. Update Delivery - V1 FIX: Ensure we use the exact field name
        await deliveriesDb.updateDelivery(editingCell.deliveryId, { [editingCell.field]: editValue }, client);

        // 2. Sync with Reel Task (Backlog)
        const existingTask = await reelsDb.getReelTaskByDelivery(editingCell.deliveryId, client);
        if (existingTask) {
          await reelsDb.updateReelTask(existingTask.id, {
            reel_link: editValue,
            status: editValue && editValue.trim() !== '' ? 'RESOLVED' : 'PENDING'
          }, client);
          console.log(`🎬 Reel Task updated for ${editingCell.deliveryId} -> ${editValue ? 'RESOLVED' : 'PENDING'}`);
        }
      } else if (editingCell.field === 'assigned_user_id') {
        const newUserId = editValue === 'unassigned' ? null : editValue;
        // 1. Update Delivery
        await deliveriesDb.updateDelivery(editingCell.deliveryId, { assigned_user_id: newUserId }, client);

        // 2. Sync with Reel Task (even if status is RESOLVED, we update the owner for historical accuracy)
        const existingTask = await reelsDb.getReelTaskByDelivery(editingCell.deliveryId, client);
        if (existingTask && newUserId) {
          await reelsDb.updateReelTask(existingTask.id, {
            assigned_user_id: newUserId
          }, client);
          console.log(`🎬 Reel Task assigned user updated for ${editingCell.deliveryId} -> ${newUserId}`);
        }
      } else if (editingCell.field === 'received_amount' || editingCell.field === 'rapido_charge') {
        // V1 FIX: Parse numeric values
        const numericValue = editValue === '' ? null : parseFloat(editValue);
        await deliveriesDb.updateDelivery(editingCell.deliveryId, { [editingCell.field]: numericValue }, client);
      } else {
        // Generic update for other fields
        await deliveriesDb.updateDelivery(editingCell.deliveryId, { [editingCell.field]: editValue }, client);
      }
    } catch (error) {
      console.error("Failed to save edit to DB:", error);
      toast.error("Failed to save changes to database");
      return;
    }

    const updatedDeliveries = deliveries.map(d =>
      d.id === editingCell.deliveryId
        ? { ...d, [editingCell.field]: editValue } as any
        : d
    );

    // V1 SPEC: Update edit history for undo/redo
    const newHistory = editHistory.slice(0, historyIndex + 1);
    newHistory.push(updatedDeliveries);
    setEditHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setDeliveries(updatedDeliveries);
    setEditingCell(null);
    setEditValue('');

    // V1 SPEC: Reel backlog is DERIVED STATE (not manual state)
    // - Exactly 1 reel per delivery (enforced by data model)
    // - Backlog exists iff reel_link cell is blank/empty
    // - DELETING reel link → recreates backlog (delivery needs reel again)
    // - OVERWRITING reel link → does NOT recreate backlog (reel satisfied)
    // - This ensures backlog is always in sync with spreadsheet state
    if (editingCell.field === 'reel_link') {
      if (!editValue || editValue.trim() === '') {
        toast.success('Reel link cleared → Reel returned to backlog');
      } else {
        toast.success('Reel link updated (no backlog created)');
      }
    } else {
      toast.success('Cell updated successfully');
    }

    // Trigger Google Sheets Sync
    if (editingCell.field === 'footage_link' || editingCell.field === 'reel_link' || 
        editingCell.field === 'received_amount' || editingCell.field === 'customer_phone' || 
        editingCell.field === 'rapido_charge' || editingCell.field === 'date' || 
        editingCell.field === 'assigned_user_id') {
      const updatedDelivery = updatedDeliveries.find(d => d.id === editingCell.deliveryId);
      if (updatedDelivery) {
        handleTriggerSheetSync(updatedDelivery, 'sync', oldSignature);
      }
    }
  };

    // V5.0 SIGNATURE LOGIC REMOVED - NOW IN lib/utils.ts

  const handleDeleteDelivery = async (deliveryId: string) => {
    if (!isAdmin) return;

    const deliveryToDelete = deliveries.find(d => d.id === deliveryId);
    if (!deliveryToDelete) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this delivery record? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      const client = supabase;
      
      // V6.0 SAFE DELETE: Stage 1 - Soft Delete in DB first
      console.log(`🗑️ [Safe Delete] Attempting soft-delete for ${deliveryId}...`);
      await deliveriesDb.softDeleteDelivery(deliveryId, client);

      // Optimistically update local state to hide it
      const updatedDeliveries = deliveries.filter(d => d.id !== deliveryId);
      setDeliveries(updatedDeliveries);

      // Update history
      const newHistory = editHistory.slice(0, historyIndex + 1);
      newHistory.push(updatedDeliveries);
      setEditHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      // V6.0 SAFE DELETE: Stage 2 - Sync deletion to Google Sheets
      // If this fails, it stays in 'pendingSyncs' (and is soft-deleted in Supabase)
      await handleTriggerSheetSync(deliveryToDelete, 'delete');

      toast.success('Deletion process started correctly.');
    } catch (error) {
      console.error('Failed to initiate delete:', error);
      toast.error('Failed to initiate delete process');
    }
  };

  const handleTriggerSheetSync = async (delivery: any, action: 'sync' | 'delete' | 'add' = 'sync', oldSignature?: string | null) => {
    const deliveryId = delivery.id;
    
    try {
      // 1. Find Dealership from loaded state
      const dealership = dealerships.find(d => getShowroomCode(d.name) === getShowroomCode(delivery.showroom_code));

      if (!dealership || !dealership.googleSheetId) {
        console.log("Sync skipped: No Google Sheet ID configured.");
        return;
      }

      const SYNC_URL = dealership.googleSyncUrl || import.meta.env.VITE_GOOGLE_SYNC_URL;
      if (!SYNC_URL) return;

      const photographer = allUsers.find(p => p.id === delivery.assigned_user_id);

      // V7.0 Logic: Send ID and UpdatedAt for robust tracking
      const payload = {
        action,
        sheetId: dealership.googleSheetId,
        id: delivery.id, // Explicit ID for V7 matching
        oldSignature: oldSignature || getDeliverySignature(delivery, photographer?.name || ''), 
        delivery: {
          id: delivery.id,
          updated_at: delivery.updated_at || new Date().toISOString(),
          date: formatDateForSheet(delivery.date),
          photographer_name: photographer?.name || '',
          footage_link: delivery.footage_link || '',
          reel_link: (delivery as any).reel_link || '',
          received_amount: delivery.received_amount || '',
          customer_phone: delivery.customer_phone || '',
          rapido_charge: delivery.rapido_charge || ''
        }
      };

      // V7.1: Use text/plain to avoid CORS preflight (OPTIONS) which Apps Script doesn't handle.
      // Apps Script will still receive the body and we can still parse the JSON response.
      const response = await fetch(SYNC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.status === 'success') {
        console.log(`🚀 Sync ${action} successful: ${delivery.date} - ${photographer?.name}`, result);
        
        // V6.0 CONFLICT HANDLING
        if (result.code === 'STALE_UPDATE') {
          console.warn('Sync conflict detected: STALE_UPDATE');
          setConflictDelivery(delivery);
          setIsConflictDialogOpen(true);
          toast.error('Sync Conflict: Someone edited this row in Google Sheets.');
          
          // Keep it in pending so the user knows it's not truly synced/resolved
          setPendingSyncs(prev => new Set(prev).add(deliveryId));
          return;
        }

        // V6.0 SAFE DELETE: Stage 3 - If successful deletion, purge from Supabase
        if (action === 'delete') {
          console.log(`🔥 [Safe Delete] Google confirmed deletion. Purging ${deliveryId} from Supabase...`);
          const client = supabase;
          
          // 1. Delete associated reel task if exists
          const reelTask = await reelsDb.getReelTaskByDelivery(deliveryId, client);
          if (reelTask) {
            await reelsDb.deleteReelTask(reelTask.id);
          }
          
          // 2. Hard Delete from Supabase
          await deliveriesDb.deleteDelivery(deliveryId, client);
          toast.success(`Permanently purged deleted record from CRM.`);
        }

        // Remove from pending if successful
        setPendingSyncs(prev => {
          const next = new Set(prev);
          next.delete(deliveryId);
          return next;
        });

        if (action === 'sync' || action === 'add') {
          toast.success(`Synced to Google Sheets: ${delivery.delivery_name}`);
        }
      } else {
        console.warn(`⚠️ Sync failed with error code: ${result.code}`, result);
        
        if (result.code === 'ROW_NOT_FOUND') {
          toast.error(`Sync Failed: Row missing from Google Sheet. Please check manually.`, { duration: 5000 });
        } else {
          toast.error(`Sync Error: ${result.message || 'Unknown error'}`);
        }
        
        // Logical errors should also be tracked in pending if they are retryable, 
        // but ROW_NOT_FOUND needs manual intervention. We'll keep it in pending for visibility.
        setPendingSyncs(prev => new Set(prev).add(deliveryId));
      }
      
    } catch (error) {
      console.error('❌ Failed to trigger Google Sheets sync (Network Error):', error);
      // Network error - add to pending queue
      setPendingSyncs(prev => new Set(prev).add(deliveryId));
      toast.error(`Sync failed (network error). Item added to pending queue.`);
    }
  };

  const handleForceOverwrite = async () => {
    if (!conflictDelivery) return;
    
    setIsSubmitting(true);
    try {
      console.log(`💪 [Conflict] Forcing move for ${conflictDelivery.id}...`);
      
      // 1. Update timestamp in DB to "now" to win the GAS versioning check
      const now = new Date().toISOString();
      const updatedDelivery = await deliveriesDb.updateDelivery(conflictDelivery.id, { 
        updated_at: now 
      });
      
      // 2. Update local state
      setDeliveries(prev => prev.map(d => d.id === updatedDelivery.id ? updatedDelivery : d));
      
      // 3. Retry sync with NEW timestamp
      await handleTriggerSheetSync(updatedDelivery, 'sync');
      
      setIsConflictDialogOpen(false);
      setConflictDelivery(null);
      toast.success('Force overwrite successful!');
    } catch (error) {
      console.error('Force overwrite failed:', error);
      toast.error('Failed to force overwrite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshFromSheet = async () => {
    if (!conflictDelivery) return;
    
    setIsSubmitting(true);
    try {
      console.log(`📥 [Conflict] Refreshing record ${conflictDelivery.id} from Google Sheets...`);
      
      const dealership = dealerships.find(d => getShowroomCode(d.name) === getShowroomCode(conflictDelivery.showroom_code));
      if (!dealership?.googleSheetId) throw new Error('No Google Sheet ID found');

      const SYNC_URL = dealership.googleSyncUrl || import.meta.env.VITE_GOOGLE_SYNC_URL;
      if (!SYNC_URL) throw new Error('No Google Sync URL configured');
      
      const response = await fetch(SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'read',
          sheetId: dealership.googleSheetId
        })
      });

      const result = await response.json();
      if (result.status === 'success' && result.stats?.rows) {
        // Find our row in the sheet data
        const sheetRows = result.stats.rows;
        const sheetRow = sheetRows.find((r: any) => 
          String(r['CRM ID'] || r['crm id']).trim() === conflictDelivery.id.trim()
        );

        if (sheetRow) {
          console.log('✅ Found matching row in sheet:', sheetRow);
          
          // Update DB with sheet data
          const updates: any = {
            delivery_name: sheetRow['Delivery Name'] || sheetRow['delivery_name'] || sheetRow['Customer Name'] || sheetRow['Customer'] || sheetRow['customer_name'] || conflictDelivery.delivery_name,
            footage_link: sheetRow['Footage Link'] || sheetRow['footage link'],
            reel_link: sheetRow['Reel Link'] || sheetRow['reel link'],
            received_amount: parseFloat(sheetRow['Amount'] || sheetRow['amount'] || '0') || null,
            customer_phone: sheetRow['Phone'] || sheetRow['phone'] || sheetRow['Customer Phone'] || sheetRow['phone_number'],
            rapido_charge: parseFloat(sheetRow['Rapido'] || sheetRow['rapido'] || '0') || null,
            updated_at: sheetRow['Updated At'] || sheetRow['updated at'] || new Date().toISOString()
          };

          const refreshedDelivery = await deliveriesDb.updateDelivery(conflictDelivery.id, updates);
          
          // Update local state
          setDeliveries(prev => prev.map(d => d.id === refreshedDelivery.id ? refreshedDelivery : d));
          
          // Remove from pending syncs since we are now matching the sheet
          setPendingSyncs(prev => {
            const next = new Set(prev);
            next.delete(conflictDelivery.id);
            return next;
          });

          setIsConflictDialogOpen(false);
          setConflictDelivery(null);
          toast.success('Successfully refreshed and synced with Google Sheets');
        } else {
          toast.error('Could not find matching row in the Google Sheet.');
        }
      } else {
        throw new Error('Failed to read data from Google Sheets');
      }
    } catch (error) {
      console.error('Refresh failed:', error);
      toast.error('Failed to refresh from Google Sheets');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSyncPending = async () => {
    if (isSyncingBulk || pendingSyncs.size === 0) return;
    
    setIsSyncingBulk(true);
    const deliveriesToSync = deliveries.filter(d => pendingSyncs.has(d.id));
    
    toast.info(`Retrying ${deliveriesToSync.length} pending syncs in bulk...`);
    
    try {
      await handleTriggerBulkSync(deliveriesToSync);
      toast.success('Pending batch sync completed.');
    } catch (err) {
      toast.error('Some pending syncs still failed.');
    } finally {
      setIsSyncingBulk(false);
    }
  };

  const handleTriggerBulkSync = async (deliveriesToSync: any[]) => {
    if (!deliveriesToSync.length) return;

    // 1. Group by Google Sheet ID AND Sync URL
    const groups: Record<string, { deliveries: any[], url: string }> = {};
    for (const d of deliveriesToSync) {
      const deal = dealerships.find(deal => getShowroomCode(deal.name) === getShowroomCode(d.showroom_code));
      if (deal?.googleSheetId) {
        const syncUrl = deal.googleSyncUrl || import.meta.env.VITE_GOOGLE_SYNC_URL;
        if (!syncUrl) continue;
        
        const key = `${deal.googleSheetId}|||${syncUrl}`;
        if (!groups[key]) groups[key] = { deliveries: [], url: syncUrl };
        groups[key].deliveries.push(d);
      }
    }

    // 2. Process each group
    for (const [key, group] of Object.entries(groups)) {
      const sheetId = key.split('|||')[0];
      const { deliveries: groupDeliveries, url: SYNC_URL } = group;
      try {
        console.log(`📦 [Bulk Sync] Sending ${groupDeliveries.length} rows to sheet: ${sheetId}`);
        
        const payload = {
          action: 'sync_bulk',
          sheetId,
          deliveries: groupDeliveries.map(d => {
            const photographer = allUsers.find(p => p.id === d.assigned_user_id);
            // V13.0 FIX: Ensure signature is included for robust de-duplication in bulk mode
            const deliveryPayload = {
              id: d.id,
              signature: getDeliverySignature(d, photographer?.name || ''),
              date: formatDateForSheet(d.date),
              photographer_name: photographer?.name || '',
              delivery_name: d.delivery_name || '',
              footage_link: d.footage_link || '',
              reel_link: (d as any).reel_link || '',
              received_amount: d.received_amount || '',
              customer_phone: d.customer_phone || '',
              rapido_charge: d.rapido_charge || '',
              updated_at: d.updated_at || new Date().toISOString()
            };
            return deliveryPayload;
          })
        };
        console.log('[Sync Debug] Sending bulk payload:', payload);

        const response = await fetch(SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.status === 'success') {
          console.log(`✅ Bulk Sync Success for sheet ${sheetId}:`, result.summary);
          // Clear successes from pendingSyncs
          setPendingSyncs(prev => {
            const next = new Set(prev);
            groupDeliveries.forEach(d => next.delete(d.id));
            return next;
          });
        } else {
          throw new Error(result.message || 'Batch failed');
        }
      } catch (err) {
        console.error(`❌ Bulk Sync Failed for sheet ${sheetId}:`, err);
        toast.error(`Sync failed for ${groupDeliveries.length} items. They remain in pending.`);
        // Ensure they are in pending
        setPendingSyncs(prev => {
          const next = new Set(prev);
          groupDeliveries.forEach(d => next.add(d.id));
          return next;
        });
      }
    }
  };

  const handleBulkSyncVisible = async () => {
    if (isSyncingBulk || filteredDeliveries.length === 0) return;
    
    const count = filteredDeliveries.length;
    const dateLabel = showAllTime ? "ALL TIME" : spreadSheetDate;
    
    if (count > 50) {
      if (!confirm(`🚨 LARGE SYNC WARNING: You are about to sync ${count} rows for ${dateLabel}.\n\nThis may take some time and could affect Google Sheets performance. Are you sure you want to proceed?`)) {
        return;
      }
    } else if (!confirm(`⚠️ Confirm: Sync all ${count} visible rows (${dateLabel}) to Google Sheets?`)) {
      return;
    }

    setIsSyncingBulk(true);
    toast.info(`Starting bulk sync for ${count} rows...`);
    
    try {
      await handleTriggerBulkSync(filteredDeliveries);
      toast.success('Bulk sync of visible rows completed.');
    } catch (err) {
      toast.error('Bulk sync experienced some errors.');
    } finally {
      setIsSyncingBulk(false);
    }
  };

  // V5.4: Background Retry Logic: Listen for online event to automatically clear queue
  useEffect(() => {
    const handleOnline = () => {
      if (pendingSyncs.size > 0) {
        console.log('🌐 Internet back online. Retrying pending syncs...');
        handleBulkSyncPending();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [pendingSyncs.size]);

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Add new row handlers
  const handleStartAddRow = () => {
    setNewRowData({
      date: getOperationalDateString(),
      showroom_id: '',
      delivery_name: '',
      footage_link: '',
      reel_link: '',
      received_amount: '',
      customer_phone: '',
      rapido_charge: '',
      payment_screenshot: null,
      rapido_screenshot: null,
      rapido_screenshot_date: '',
      rapido_screenshot_time: '',
      rapido_screenshot_amount: '',
      assigned_user_id: '',
      payment_screenshot_date: '',
      payment_screenshot_time: '',
      payment_screenshot_amount: '',
      platform_payment_screenshot: null,
      platform_payment_amount: '',
      platform_payment_screenshot_date: '',
      platform_payment_screenshot_time: '',
      platform_payment_screenshot_amount: '',
      witness_phone: '',
      fraud_screenshot: null,
      fraud_call_log_screenshot: null,
    });
    setIsAddDialogOpen(true);
  };

  const handleSaveNewRow = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!newRowData.date || !newRowData.showroom_id) {
        toast.error('Please fill in required fields: Date and Showroom');
        return;
      }

      // V14.0: Validate photographer select for admin logging
      if (!newRowData.assigned_user_id) {
        toast.error('Please select the photographer who covered this delivery');
        return;
      }

      const selectedDealership = dealerships.find(d => d.id === newRowData.showroom_id);
      if (!selectedDealership) {
        return;
      }

      // V11.0: Duplicate Link Validation for New Rows
      if (newRowData.footage_link && newRowData.footage_link.trim() !== '') {
        try {
          const showroomCode = getShowroomCode(selectedDealership.name);
          const duplicate = await deliveriesDb.checkDuplicateFootageLink(newRowData.footage_link, showroomCode);
          if (duplicate) {
            toast.error(`Duplicate link detected! This link is already used for ${duplicate.delivery_name}.`);
            setIsSubmitting(false);
            return;
          }
        } catch (error) {
          console.error('Duplicate check failed:', error);
        }
      }

      // V1 SPEC: Payment Amount, Screenshot & Phone are MANDATORY for Customer Paid showrooms
      if (selectedDealership.paymentType === 'CUSTOMER_PAID') {
        if (!newRowData.received_amount || parseFloat(newRowData.received_amount) <= 0) {
          toast.error('Payment amount is mandatory for Customer Paid showrooms');
          setIsSubmitting(false);
          return;
        }
        if (!newRowData.customer_phone || newRowData.customer_phone.trim().length < 10) {
          toast.error('Valid customer phone number is mandatory for Customer Paid showrooms');
          setIsSubmitting(false);
          return;
        }
        if (!newRowData.payment_screenshot) {
          toast.error('Payment screenshot is mandatory for Customer Paid showrooms');
          setIsSubmitting(false);
          return;
        }
        if (!newRowData.payment_screenshot_date || !newRowData.payment_screenshot_time || !newRowData.payment_screenshot_amount) {
          toast.error('Customer payment screenshot metadata (Date, Time, Amount) is mandatory');
          setIsSubmitting(false);
          return;
        }
        if (parseFloat(newRowData.payment_screenshot_amount) !== parseFloat(newRowData.received_amount)) {
          toast.error('Customer payment screenshot amount must match the collection amount');
          setIsSubmitting(false);
          return;
        }
        if (!newRowData.customer_call_log_screenshot) {
          toast.error('Customer call log screenshot is mandatory for Customer Paid showrooms');
          setIsSubmitting(false);
          return;
        }
        if (!newRowData.actual_amount_confirmed_by_customer || parseFloat(newRowData.actual_amount_confirmed_by_customer) <= 0) {
          toast.error('Valid confirmed amount is mandatory for Customer Paid showrooms');
          setIsSubmitting(false);
          return;
        }
      }

      // Photographer Payout model verification
      const selectedPhotographer = allUsers.find(p => p.id === newRowData.assigned_user_id);
      const payoutModel = selectedPhotographer ? getPhotographerRawPayoutModel(selectedPhotographer.id, newRowData.date) : 'PERCENTAGE';
      const showPlatformPaymentFields = selectedDealership.paymentType === 'CUSTOMER_PAID' && payoutModel === 'PERCENTAGE_15_DAILY';

      if (showPlatformPaymentFields) {
        const expectedCut = Math.max(0, Math.round((parseFloat(newRowData.received_amount || '0') - parseFloat(newRowData.rapido_charge || '0')) * 0.15));
        if (!newRowData.platform_payment_amount) {
          toast.error('Platform payment amount is mandatory for 15% payout model');
          setIsSubmitting(false);
          return;
        }
        if (parseInt(newRowData.platform_payment_amount) !== expectedCut) {
          toast.error(`Platform payment amount is incorrect! Expected: ₹${expectedCut} (15% of collection - rapido)`);
          setIsSubmitting(false);
          return;
        }
        if (!newRowData.platform_payment_screenshot) {
          toast.error('Platform payment screenshot is mandatory');
          setIsSubmitting(false);
          return;
        }
        if (!newRowData.platform_payment_screenshot_date || !newRowData.platform_payment_screenshot_time || !newRowData.platform_payment_screenshot_amount) {
          toast.error('Platform payment screenshot metadata (Date, Time, Amount) is mandatory');
          setIsSubmitting(false);
          return;
        }
        if (parseFloat(newRowData.platform_payment_screenshot_amount) !== parseFloat(newRowData.platform_payment_amount)) {
          toast.error('Platform payment screenshot amount must match the platform payment amount');
          setIsSubmitting(false);
          return;
        }
      }

      // Rapido Charge is mandatory - it cannot be blank
      if (newRowData.rapido_charge === '') {
        toast.error('Rapido charge is mandatory (put 0 if there are no charges)');
        setIsSubmitting(false);
        return;
      }
      
      // If Rapido Charge is non-zero, screenshot and metadata are mandatory
      if (parseFloat(newRowData.rapido_charge) > 0) {
        if (!newRowData.rapido_screenshot) {
          toast.error('Rapido screenshot is mandatory when charge is greater than 0');
          setIsSubmitting(false);
          return;
        }
        if (!newRowData.rapido_screenshot_date || !newRowData.rapido_screenshot_time || !newRowData.rapido_screenshot_amount) {
          toast.error('Rapido screenshot metadata (Date, Time, Amount) is mandatory');
          setIsSubmitting(false);
          return;
        }
        if (parseFloat(newRowData.rapido_screenshot_amount) !== parseFloat(newRowData.rapido_charge)) {
          toast.error('Rapido screenshot amount must match the rapido charge');
          setIsSubmitting(false);
          return;
        }
      }

      // Fraud Detection check for this combo
      const showroomCodeForFraud = getShowroomCode(selectedDealership.name);
      const fraudAlreadyVerified = !!(
        newRowData.date &&
        newRowData.assigned_user_id &&
        showroomCodeForFraud &&
        deliveries.some(d => 
          d.date === newRowData.date && 
          d.assigned_user_id === newRowData.assigned_user_id && 
          getShowroomCode(d.showroom_code) === showroomCodeForFraud && 
          (!!d.witness_phone || screenshots.some(s => s.delivery_id === d.id && s.type === 'FRAUD_DETECTION' && !s.deleted_at))
        )
      );

      if (!fraudAlreadyVerified) {
        if (!newRowData.witness_phone || newRowData.witness_phone.trim().length < 10) {
          toast.error('Witness Phone Number is mandatory and must be a valid 10-digit number');
          setIsSubmitting(false);
          return;
        }
        if (!newRowData.fraud_screenshot) {
          toast.error('Fraud screenshot upload is mandatory');
          setIsSubmitting(false);
          return;
        }
        if (!newRowData.fraud_call_log_screenshot) {
          toast.error('Fraud call log screenshot upload is mandatory');
          setIsSubmitting(false);
          return;
        }
      }

      // Generate delivery_name if blank
      let finalDeliveryName = newRowData.delivery_name;
      if (!finalDeliveryName) {
        const dateStr = newRowData.date.split('-').reverse().join('-'); // DD-MM-YYYY
        const photographerUser = allUsers.find(p => p.id === newRowData.assigned_user_id);
        const photographerName = photographerUser?.name?.split(' ')[0] || 'USER';
        finalDeliveryName = `${dateStr}_${selectedDealership.name.split(' ')[0]}_${photographerName}_${Date.now().toString().slice(-4)}`.toUpperCase();
      }

      await simulateApiDelay(200);

      // Extract showroom code from dealership name (e.g., "Khatri Wheels (KHTR_WH)" -> "KHTR_WH")
      const showroomCode = getShowroomCode(selectedDealership.name);

      // Find the mapping to get cluster_code
      const mapping = mappings.find(m => m.dealershipId === selectedDealership.id);
      const cluster = clusters.find(c => c.id === mapping?.clusterId);

      // Use cluster name as code if explicit code not available (centralized with HomeScreen logic)
      const clusterCode = cluster?.name || 'UNKNOWN';

      // Create new delivery object
      const newDelivery: Delivery = {
        id: `delivery_${Date.now()}`,
        date: newRowData.date,
        showroom_code: showroomCode,
        cluster_code: clusterCode,
        showroom_type: mapping?.mappingType || 'SECONDARY',
        timing: null,
        delivery_name: finalDeliveryName,
        status: 'DONE', // V1 SPEC: Spreadsheet only shows DONE deliveries
        assigned_user_id: newRowData.assigned_user_id || null, // V14.0 FIX: Assign to selected photographer, not admin
        footage_link: newRowData.footage_link || null,
        payment_type: selectedDealership.paymentType,
        received_amount: newRowData.received_amount 
          ? parseFloat(newRowData.received_amount) 
          : (selectedDealership.paymentType === 'DEALER_PAID' ? selectedDealership.ratePerDelivery : undefined),
        customer_phone: newRowData.customer_phone || undefined,
        rapido_charge: newRowData.rapido_charge ? parseFloat(newRowData.rapido_charge) : undefined,
        rapido_screenshot_date: newRowData.rapido_charge && parseFloat(newRowData.rapido_charge) > 0 ? newRowData.rapido_screenshot_date : null,
        rapido_screenshot_time: newRowData.rapido_charge && parseFloat(newRowData.rapido_charge) > 0 ? newRowData.rapido_screenshot_time : null,
        rapido_screenshot_amount: newRowData.rapido_charge && parseFloat(newRowData.rapido_charge) > 0 ? parseFloat(newRowData.rapido_screenshot_amount) : null,
        
        witness_phone: !fraudAlreadyVerified ? newRowData.witness_phone.trim() : null,
        payment_screenshot_date: selectedDealership.paymentType === 'CUSTOMER_PAID' ? newRowData.payment_screenshot_date : null,
        payment_screenshot_time: selectedDealership.paymentType === 'CUSTOMER_PAID' ? newRowData.payment_screenshot_time : null,
        payment_screenshot_amount: selectedDealership.paymentType === 'CUSTOMER_PAID' ? parseFloat(newRowData.payment_screenshot_amount) : null,
        
        platform_payment_screenshot_date: showPlatformPaymentFields ? newRowData.platform_payment_screenshot_date : null,
        platform_payment_screenshot_time: showPlatformPaymentFields ? newRowData.platform_payment_screenshot_time : null,
        platform_payment_screenshot_amount: showPlatformPaymentFields ? parseFloat(newRowData.platform_payment_screenshot_amount) : null,

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add reel_link if provided
      (newDelivery as any).reel_link = newRowData.reel_link || '';

      // V1 SPEC: Replace the placeholder row with the actual delivery
      // and update edit history for undo/redo  
      console.log('=== SAVE NEW ROW DEBUG ===');
      console.log('Before save - historyIndex:', historyIndex, 'editHistory.length:', editHistory.length);
      console.log('Current viewMode:', viewMode);

      // V5.0 SIGNATURE SYNC: Add row to Supabase and Google Sheets
      const client = supabase;
      
      // 1. Save to Supabase
      const savedDelivery = await deliveriesDb.createDelivery(newDelivery, client);

      // 2. Upload Screenshots if provided
      const newScreenshotsList: any[] = [];

      if (newRowData.payment_screenshot) {
        const path = `payments/${savedDelivery.id}_${Date.now()}.jpg`;
        const url = await screenshotsDb.uploadScreenshotFile(newRowData.payment_screenshot, path, client);
        const scr = await screenshotsDb.createScreenshot({
          delivery_id: savedDelivery.id,
          user_id: newRowData.assigned_user_id || user?.id || '', // V14.0: Associate screenshot with the photographer
          type: 'PAYMENT',
          file_url: url,
          thumbnail_url: url,
          deleted_at: null
        }, client);
        if (scr) newScreenshotsList.push(scr);
      }

      if (newRowData.rapido_screenshot) {
        const path = `rapido/${savedDelivery.id}_${Date.now()}.jpg`;
        const url = await screenshotsDb.uploadScreenshotFile(newRowData.rapido_screenshot, path, client);
        const scr = await screenshotsDb.createScreenshot({
          delivery_id: savedDelivery.id,
          user_id: newRowData.assigned_user_id || user?.id || '', // V14.0: Associate screenshot with the photographer
          type: 'RAPIDO',
          file_url: url,
          thumbnail_url: url,
          deleted_at: null
        }, client);
        if (scr) newScreenshotsList.push(scr);
      }

      if (newRowData.platform_payment_screenshot) {
        const path = `platform_payments/${savedDelivery.id}_${Date.now()}.jpg`;
        const url = await screenshotsDb.uploadScreenshotFile(newRowData.platform_payment_screenshot, path, client);
        const scr = await screenshotsDb.createScreenshot({
          delivery_id: savedDelivery.id,
          user_id: newRowData.assigned_user_id || user?.id || '',
          type: 'PLATFORM_PAYMENT',
          file_url: url,
          thumbnail_url: url,
          deleted_at: null
        }, client);
        if (scr) newScreenshotsList.push(scr);
      }

      if (!fraudAlreadyVerified && newRowData.fraud_screenshot) {
        const path = `fraud/${savedDelivery.id}_${Date.now()}.jpg`;
        const url = await screenshotsDb.uploadScreenshotFile(newRowData.fraud_screenshot, path, client);
        const scr = await screenshotsDb.createScreenshot({
          delivery_id: savedDelivery.id,
          user_id: newRowData.assigned_user_id || user?.id || '',
          type: 'FRAUD_DETECTION',
          file_url: url,
          thumbnail_url: url,
          deleted_at: null
        }, client);
        if (scr) newScreenshotsList.push(scr);
      }

      if (!fraudAlreadyVerified && newRowData.fraud_call_log_screenshot) {
        const path = `call_logs/${savedDelivery.id}_${Date.now()}.jpg`;
        const url = await screenshotsDb.uploadScreenshotFile(newRowData.fraud_call_log_screenshot, path, client);
        const scr = await screenshotsDb.createScreenshot({
          delivery_id: savedDelivery.id,
          user_id: newRowData.assigned_user_id || user?.id || '',
          type: 'FRAUD_DETECTION',
          file_url: url,
          thumbnail_url: url,
          deleted_at: null
        }, client);
        if (scr) newScreenshotsList.push(scr);
      }
      
      if (selectedDealership.paymentType === 'CUSTOMER_PAID' && newRowData.customer_call_log_screenshot && newRowData.actual_amount_confirmed_by_customer) {
        const path = `customer_call_logs/${savedDelivery.id}_${Date.now()}.jpg`;
        const url = await screenshotsDb.uploadScreenshotFile(newRowData.customer_call_log_screenshot, path, client);
        const scr = await screenshotsDb.createScreenshot({
          delivery_id: savedDelivery.id,
          user_id: newRowData.assigned_user_id || user?.id || '',
          type: `CUSTOMER_CALL_LOG:${newRowData.actual_amount_confirmed_by_customer}`,
          file_url: url,
          thumbnail_url: url,
          deleted_at: null
        }, client);
        if (scr) newScreenshotsList.push(scr);
      }

      if (newScreenshotsList.length > 0) {
        setScreenshots(prev => [...newScreenshotsList, ...prev]);
      }
      
      // 3. Sync with Google Sheets
      await handleTriggerSheetSync(savedDelivery, 'sync', null); // null oldSignature means add new row

      // 3. Update local state with the saved delivery (to get the real ID)
      setDeliveries(prevDeliveries => {
        const updatedDeliveries = [...prevDeliveries, savedDelivery];

        setEditHistory(prevHistory => {
          setHistoryIndex(prevIndex => {
            const newHistory = prevHistory.slice(0, prevIndex + 1);
            newHistory.push(updatedDeliveries);
            return newHistory.length - 1;
          });
          return [...prevHistory.slice(0, historyIndex + 1), updatedDeliveries];
        });

        return updatedDeliveries;
      });

      // V9.0: Auto-set filter date to the new record's date so the user can see it
      setSpreadSheetDate(savedDelivery.date);
      setShowAllTime(false); // Switch to specific date view if all-time was on

      setIsAddDialogOpen(false);
      
      // Reset new row form
      setNewRowData({
        date: '',
        showroom_id: '',
        delivery_name: '',
        footage_link: '',
        reel_link: '',
        received_amount: '',
        customer_phone: '',
        rapido_charge: '',
        payment_screenshot: null,
        rapido_screenshot: null,
        assigned_user_id: ''
      });

      toast.success('Delivery row saved and synced successfully');
    } catch (error) {
      console.error('Failed to create delivery:', error);
      toast.error('Failed to save delivery record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAddRow = () => {
    setIsAddDialogOpen(false);
  };

  const photographerDeliveries = React.useMemo(() => {
    if (!selectedPhotographer || selectedPhotographer === 'all') return [];
    return deliveries.filter(d => d.assigned_user_id === selectedPhotographer && d.date === spreadSheetDate && d.status === 'DONE');
  }, [deliveries, selectedPhotographer, spreadSheetDate]);

  const uniqueShowroomCodesForPhotographer = React.useMemo(() => {
    return Array.from(new Set(photographerDeliveries.map(d => getShowroomCode(d.showroom_code))));
  }, [photographerDeliveries]);

  const customerPaidDeliveries = React.useMemo(() => {
    return photographerDeliveries.filter(d => d.payment_type === 'CUSTOMER_PAID');
  }, [photographerDeliveries]);

  const [verificationInputs, setVerificationInputs] = useState<Record<string, {
    payment_date: string;
    payment_time: string;
    payment_amount: string;
    platform_date: string;
    platform_time: string;
    platform_amount: string;
    rapido_date: string;
    rapido_time: string;
    rapido_amount: string;
    witness_phone: string;
  }>>({});

  useEffect(() => {
    if (viewMode === 'audit' && selectedPhotographer && selectedPhotographer !== 'all' && spreadSheetDate) {
      const inputs: any = {};
      photographerDeliveries.forEach(d => {
        inputs[d.id] = {
          payment_date: d.payment_screenshot_date || '',
          payment_time: d.payment_screenshot_time || '',
          payment_amount: d.payment_screenshot_amount != null ? String(d.payment_screenshot_amount) : '',
          platform_date: d.platform_payment_screenshot_date || '',
          platform_time: d.platform_payment_screenshot_time || '',
          platform_amount: d.platform_payment_screenshot_amount != null ? String(d.platform_payment_screenshot_amount) : '',
          rapido_date: d.rapido_screenshot_date || '',
          rapido_time: d.rapido_screenshot_time || '',
          rapido_amount: d.rapido_screenshot_amount != null ? String(d.rapido_screenshot_amount) : '',
          witness_phone: d.witness_phone || '',
        };
      });
      setVerificationInputs(inputs);
    }
  }, [selectedPhotographer, spreadSheetDate, viewMode, photographerDeliveries]);

  const paymentScreenshots = screenshots.filter(s => s.type === 'PAYMENT' && !s.deleted_at);
  const followScreenshots = screenshots.filter(s => s.type === 'FOLLOW' && !s.deleted_at);
  const rapidoScreenshots = screenshots.filter(s => s.type === 'RAPIDO' && !s.deleted_at);
  const platformPaymentScreenshots = screenshots.filter(s => s.type === 'PLATFORM_PAYMENT' && !s.deleted_at);
  const fraudDetectionScreenshots = screenshots.filter(s => s.type === 'FRAUD_DETECTION' && !s.deleted_at);

  // V1 SPEC: Apply filters to screenshots
  const applyFilters = (screenshotList: any[]) => {
    return screenshotList.filter(s => {
      // Photographer filter
      if (selectedPhotographer !== 'all' && s.user_id !== selectedPhotographer) {
        return false;
      }

      return true;
    });
  };

  const filteredPaymentScreenshots = applyFilters(paymentScreenshots);
  const filteredFollowScreenshots = applyFilters(followScreenshots);
  const filteredRapidoScreenshots = applyFilters(rapidoScreenshots);
  const filteredPlatformPaymentScreenshots = applyFilters(platformPaymentScreenshots);
  const filteredFraudDetectionScreenshots = applyFilters(fraudDetectionScreenshots);

  // Get unique dates and photographers for filter options
  const uniqueDates = Array.from(new Set(screenshots.map(s => getOperationalDateString(new Date(s.uploaded_at)))));
  const uniquePhotographers = Array.from(new Set(screenshots.map(s => s.user_id)));

  const selectedPhotographerStatus = photographerStatusList.find(p => p.id === selectedPhotographer);
  const showTask2And3 = selectedPhotographerStatus 
    ? (selectedPhotographerStatus.hasSentUpdate !== false || photographerDeliveries.length > 0) 
    : true;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-36 p-2 sm:p-4">
      {/* Top Selectors - Side-by-Side on Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Main Tab</label>
              <Select value={mainTab} onValueChange={(v: any) => setMainTab(v)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="earnings" className="text-sm font-semibold">💰 Earnings Tracker</SelectItem>
                  <SelectItem value="data" className="text-sm font-semibold">📊 Data Views</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {mainTab === 'data' && (
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">View Mode</label>
                <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel className="text-xs font-bold text-gray-400 uppercase">📊 Data Views</SelectLabel>
                      <SelectItem value="spreadsheet" className="text-sm">Spreadsheet View</SelectItem>
                      <SelectItem value="portrait" className="text-sm">Live Portrait Bookings</SelectItem>
                    </SelectGroup>
                    {(isAdmin || user?.role === 'SUPER_ADMIN') && (
                      <SelectGroup className="mt-2">
                        <SelectSeparator />
                        <SelectLabel className="text-xs font-bold text-gray-400 uppercase mt-1">🔒 Audit Views</SelectLabel>
                        <SelectItem value="audit" className="text-sm">Photographer Audit</SelectItem>
                        <SelectItem value="call_logs" className="text-sm">Call Logs</SelectItem>
                        <SelectItem value="logs" className="text-sm">Admin Logs</SelectItem>
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Earnings Tracker (Photographer Only) */}
      {mainTab === 'earnings' && (
        <EarningsTracker />
      )}

      {/* Data Views (Admin + Photographer) */}
      {mainTab === 'data' && (
        <div className="space-y-4">
          {/* Admin Client Status (Compact) */}
          {isAdmin && (
            <div className={`p-2 rounded text-[10px] border ${adminSupabase ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <p className="font-bold flex items-center gap-2">
                {adminSupabase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                Admin Client: {adminSupabase ? 'ACTIVE' : 'INACTIVE'}
              </p>
            </div>
          )}

          {/* Admin Configuration Access (Admin Only) */}
          {isAdmin && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="border-blue-200 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => navigate('/admin/config')}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                      <Settings className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Config</p>
                      <p className="text-[10px] text-blue-700">Clusters & Dealerships</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50 cursor-pointer hover:bg-purple-100 transition-colors" onClick={() => navigate('/admin/leave')}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                      <Calendar className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-purple-900">Leaves</p>
                      <p className="text-[10px] text-purple-700">Manage photographer leave</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`border-orange-200 bg-orange-50 cursor-pointer transition-colors ${auditLoading ? 'opacity-70' : 'hover:bg-orange-100'}`}
                onClick={!auditLoading ? handleRunAudit : undefined}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg shrink-0">
                      <ClipboardCheck className={`h-4 w-4 text-orange-600 ${auditLoading ? 'animate-pulse' : ''}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-orange-900">{auditLoading ? 'Auditing...' : 'Audit'}</p>
                      <p className="text-[10px] text-orange-700">Nudge missing updates</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Spreadsheet View */}
          {viewMode === 'spreadsheet' && (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="text-lg">Deliveries Covered Log</CardTitle>
                    
                    {/* Action Buttons Container - Optimized for Mobile */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-md border border-gray-200">
                        <Button
                          onClick={handleUndo}
                          size="sm"
                          variant="ghost"
                          disabled={historyIndex <= 0}
                          className="h-8 px-2 text-[10px]"
                        >
                          <Undo2 className="h-3 w-3 mr-1" />
                          Undo
                        </Button>
                        <div className="w-[1px] h-4 bg-gray-200" />
                        <Button
                          onClick={handleRedo}
                          size="sm"
                          variant="ghost"
                          disabled={historyIndex >= editHistory.length - 1}
                          className="h-8 px-2 text-[10px]"
                        >
                          Redo
                          <Redo2 className="h-3 w-3 ml-1" />
                        </Button>
                      </div>

                      <Button 
                        onClick={handleBulkSyncPending} 
                        disabled={pendingSyncs.size === 0 || isSyncingBulk}
                        size="sm" 
                        variant={pendingSyncs.size > 0 ? "destructive" : "outline"}
                        className="h-8 text-[10px] gap-1 px-2"
                      >
                        <BellRing className={`h-3 w-3 ${pendingSyncs.size > 0 ? "animate-pulse" : ""}`} />
                        {isSyncingBulk ? "..." : `${pendingSyncs.size} Pending`}
                      </Button>

                      <Button 
                        onClick={handleBulkSyncVisible} 
                        disabled={isSyncingBulk || filteredDeliveries.length === 0}
                        size="sm" 
                        variant="default"
                        className="h-8 text-[10px] gap-1 px-2 bg-blue-600 hover:bg-blue-700"
                      >
                        <RefreshCw className={`h-3 w-3 ${isSyncingBulk ? "animate-spin" : ""}`} />
                        Sync {filteredDeliveries.length}
                      </Button>

                      <Button onClick={handleExportCSV} size="sm" className="h-8 text-[10px] gap-1 px-2">
                        <Download className="h-3 w-3" />
                        CSV
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Showroom/Dealership Filter */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Dealership</label>
                      <SearchableSelect
                        options={[
                          { label: "All Dealerships", value: "all" },
                          ...dealerships.slice().sort((a, b) => a.name.localeCompare(b.name)).map(d => ({
                            label: d.name,
                            value: d.id
                          }))
                        ]}
                        value={selectedShowroom}
                        onValueChange={setSelectedShowroom}
                        placeholder="Select dealership"
                      />
                    </div>

                    {/* V9.0: Date Filter */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Filter by Date</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="showAllTime" 
                            checked={showAllTime} 
                            onChange={(e) => setShowAllTime(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="showAllTime" className="text-sm text-gray-600 cursor-pointer">Show All Time</label>
                        </div>
                      </div>
                      <Input
                        type="date"
                        value={spreadSheetDate}
                        onChange={(e) => setSpreadSheetDate(e.target.value)}
                        disabled={showAllTime}
                        className={showAllTime ? 'opacity-50' : ''}
                      />
                    </div>
                  </div>

                  {/* V1 SPEC: Spreadsheet is a log of covered deliveries */}
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                    <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-700" />
                    <div className="text-blue-800">
                      <p className="font-medium">Delivery Coverage Log</p>
                      <p className="text-xs text-blue-700 mt-1">
                        This sheet shows only deliveries where SEND UPDATE was pressed (status: DONE). Deliveries with just footage links (draft state) do not appear here.
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Delivery Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Footage Link</TableHead>
                        <TableHead>Reel Link</TableHead>
                        <TableHead>Photographer Name</TableHead>
                        <TableHead>Amount Received</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Rapido Charge</TableHead>
                        <TableHead className="w-[80px] text-center">Sync</TableHead>
                        {isAdmin && <TableHead className="w-[50px] text-right text-gray-400">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeliveries
                        .map(delivery => {
                          const photographer = allUsers.find(p => p.id === delivery.assigned_user_id);

                          // V1 SPEC: Showroom = "Dealership Name + Cluster Name"
                          // Resolved from showroom_code
                          let showroomDisplay = 'Unknown Showroom';
                          const resolvedDealership = dealerships.find(d => {
                            const code = getShowroomCode(d.name);
                            return code === delivery.showroom_code;
                          });

                          if (resolvedDealership) {
                            // Fix: Dealership doesn't have cluster_id, find via mapping
                            const mapping = mappings.find(m => m.dealershipId === resolvedDealership.id);
                            const cluster = clusters.find(c => c.id === mapping?.clusterId || c.name === delivery.cluster_code);
                            showroomDisplay = cluster ? `${resolvedDealership.name} ${cluster.name}` : resolvedDealership.name;
                          } else {
                            showroomDisplay = delivery.showroom_code; // Fallback
                          }

                          const isEditingFootage = editingCell?.deliveryId === delivery.id && editingCell?.field === 'footage_link';
                          const isEditingReel = editingCell?.deliveryId === delivery.id && editingCell?.field === 'reel_link';

                          return (
                            <TableRow key={delivery.id}>
                              {/* Delivery Name (Editable for Admin) */}
                              <TableCell className="text-sm font-medium">
                                {editingCell?.deliveryId === delivery.id && editingCell?.field === 'delivery_name' ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="h-7 text-xs w-[150px]"
                                      placeholder="Customer Name"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                    />
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                                      <Check className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                      <X className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    className={`flex items-center gap-2 p-1 rounded group ${isAdmin ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                    onClick={() => isAdmin && handleStartEdit(delivery.id, 'delivery_name', delivery.delivery_name || '')}
                                    title={isAdmin ? "Click to edit delivery/customer name" : ""}
                                  >
                                    <span className="truncate max-w-[150px]">
                                      {delivery.delivery_name}
                                    </span>
                                    {isAdmin && (
                                      <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                                    )}
                                  </div>
                                )}
                              </TableCell>

                              <TableCell className="text-sm">
                                {(() => {
                                  if (!delivery.date || typeof delivery.date !== 'string') return 'N/A';
                                  // V4.7 FIX: Handle data corruption (e.g. strings containing "?historyState")
                                  const baseDate = delivery.date.split('?')[0];
                                  const parts = baseDate.split('-');
                                  if (parts.length < 3) return baseDate;
                                  const [y, m, d] = parts;
                                  return `${d}/${m}/${y}`;
                                })()}
                              </TableCell>

                              {/* Footage Link (Editable) */}
                              <TableCell className="text-sm">
                                {isEditingFootage ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="h-7 text-xs"
                                      placeholder="https://drive.google.com/..."
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                    />
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                                      <Check className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                      <X className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    className="flex items-center gap-2 p-1 rounded group cursor-pointer hover:bg-gray-50"
                                    onClick={() => handleStartEdit(delivery.id, 'footage_link', delivery.footage_link || '')}
                                    title={`Click to add/edit footage link (${showroomDisplay} - ${delivery.delivery_name})`}
                                  >
                                    <span className="flex-1 truncate max-w-[200px]">
                                      {delivery.footage_link || <span className="text-gray-400">Click to add</span>}
                                    </span>
                                    <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                                  </div>
                                )}
                              </TableCell>

                              {/* Reel Link (Editable) */}
                              <TableCell className="text-sm">
                                {isEditingReel ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="h-7 text-xs"
                                      placeholder="Reel link or leave empty"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                    />
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                                      <Check className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                      <X className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    className="flex items-center gap-2 p-1 rounded group cursor-pointer hover:bg-gray-50"
                                    onClick={() => handleStartEdit(delivery.id, 'reel_link', (delivery as any).reel_link || '')}
                                    title="Click to add/edit reel link"
                                  >
                                    <span className="flex-1 truncate max-w-[200px]">
                                      {(delivery as any).reel_link || <span className="text-gray-400">Click to add</span>}
                                    </span>
                                    <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                                  </div>
                                )}
                              </TableCell>

                              {/* Photographer Name (Editable for Admin) */}
                              <TableCell className="text-sm">
                                {editingCell?.deliveryId === delivery.id && editingCell?.field === 'assigned_user_id' ? (
                                  <div className="flex items-center gap-1">
                                    <Select
                                      value={editValue}
                                      onValueChange={setEditValue}
                                    >
                                      <SelectTrigger className="h-7 text-xs w-[180px]">
                                        <SelectValue placeholder="Select Photographer" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {photographers.map(p => {
                                          // Determine leave status
                                          let isLeft = false;
                                          if (delivery.date) {
                                            const hours = delivery.timing ? parseInt(delivery.timing.split(':')[0]) : 9;
                                            const half = hours < 14 ? 'FIRST_HALF' : 'SECOND_HALF';
                                            isLeft = isPhotographerOnLeave(p.id, delivery.date, half);
                                          }

                                          return (
                                            <SelectItem key={p.id} value={p.id} className={isLeft ? "text-red-500 font-medium" : ""}>
                                              {p.name} {isLeft ? '(On Leave)' : ''}
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                                      <Check className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                      <X className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    className={`flex items-center gap-2 p-1 rounded group ${isAdmin ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                    onClick={() => isAdmin && handleStartEdit(delivery.id, 'assigned_user_id', delivery.assigned_user_id || 'unassigned')}
                                    title={isAdmin ? "Click to reassign photographer" : ""}
                                  >
                                    <span className={!photographer ? "text-red-500 font-medium" : ""}>
                                      {photographer?.name || 'Unassigned'}
                                    </span>
                                    {isAdmin && (
                                      <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              {/* Amount Received (Editable for Admin) */}
                              <TableCell className="text-sm">
                                {editingCell?.deliveryId === delivery.id && editingCell?.field === 'received_amount' ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="h-7 text-xs w-[80px]"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                    />
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                                      <Check className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                      <X className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    className={`flex items-center gap-2 p-1 rounded group ${isAdmin ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                    onClick={() => isAdmin && handleStartEdit(delivery.id, 'received_amount', delivery.received_amount?.toString() || '')}
                                    title={isAdmin ? "Click to edit amount" : "Admin-only"}
                                  >
                                    {delivery.received_amount ? (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        ₹{delivery.received_amount}
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                    {isAdmin && (
                                      <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              {/* Phone Number (Editable for Admin) */}
                              <TableCell className="text-sm font-mono">
                                {editingCell?.deliveryId === delivery.id && editingCell?.field === 'customer_phone' ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="h-7 text-xs w-[120px]"
                                      placeholder="Phone number"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                    />
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                                      <Check className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                      <X className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    className={`flex items-center gap-2 p-1 rounded group ${isAdmin ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                    onClick={() => isAdmin && handleStartEdit(delivery.id, 'customer_phone', delivery.customer_phone || '')}
                                    title={isAdmin ? "Click to edit phone number" : "Admin-only"}
                                  >
                                    <span>{delivery.customer_phone || <span className="text-gray-400">-</span>}</span>
                                    {isAdmin && (
                                      <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              {/* Rapido Charge (Editable for Admin) */}
                              <TableCell className="text-sm">
                                {editingCell?.deliveryId === delivery.id && editingCell?.field === 'rapido_charge' ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="h-7 text-xs w-[80px]"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                    />
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                                      <Check className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                      <X className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    className={`flex items-center gap-2 p-1 rounded group ${isAdmin ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                    onClick={() => isAdmin && handleStartEdit(delivery.id, 'rapido_charge', delivery.rapido_charge?.toString() || '')}
                                    title={isAdmin ? "Click to edit charge" : "Admin-only"}
                                  >
                                    {delivery.rapido_charge ? (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                        ₹{delivery.rapido_charge}
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                    {isAdmin && (
                                      <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              {/* Sync Status Icon */}
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-8 w-8 p-0 rounded-full ${pendingSyncs.has(delivery.id) ? 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700' : 'text-gray-400 hover:text-blue-600'}`}
                                  onClick={() => handleTriggerSheetSync(delivery, 'sync')}
                                  disabled={isSyncingBulk}
                                  title={pendingSyncs.has(delivery.id) ? "Sync Pending/Failed (Click to retry)" : "Sync to Google Sheets"}
                                >
                                  {pendingSyncs.has(delivery.id) ? (
                                    <AlertTriangle className="h-4 w-4 animate-pulse" />
                                  ) : (
                                    <RefreshCw className={`h-4 w-4 ${isSyncingBulk ? 'opacity-50' : ''}`} />
                                  )}
                                </Button>
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteDelivery(delivery.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}

                      {/* Add New Row Dialog */}
                      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                          <DialogHeader className="px-6 py-4 border-b">
                            <DialogTitle>Add New Delivery Record</DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-gray-500">Date</label>
                                <Input
                                  type="date"
                                  value={newRowData.date}
                                  onChange={(e) => setNewRowData({ ...newRowData, date: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-gray-500">Showroom</label>
                                <SearchableSelect
                                  options={dealerships.map(d => ({ 
                                    label: getShowroomDisplayName(d.id), 
                                    value: d.id 
                                  }))}
                                  value={newRowData.showroom_id}
                                  onValueChange={(value) => setNewRowData({ ...newRowData, showroom_id: value })}
                                  placeholder="Select showroom"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase text-gray-500">Photographer</label>
                              <Select
                                value={newRowData.assigned_user_id}
                                onValueChange={(value) => setNewRowData({ ...newRowData, assigned_user_id: value })}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select photographer" />
                                </SelectTrigger>
                                <SelectContent>
                                  {cityIsolatedPhotographers.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {(() => {
                              const photographerObj = allUsers.find(p => p.id === newRowData.assigned_user_id);
                              if (!photographerObj || (!photographerObj.phone_number && !photographerObj.secondary_phone_number)) return null;
                              return (
                                <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-md flex justify-between items-center text-xs">
                                  <span className="text-gray-600 font-semibold">Photographer Contact:</span>
                                  <div className="flex gap-3 text-right">
                                    {photographerObj.phone_number && (
                                      <span>Primary: <span className="font-mono font-bold text-gray-900">{photographerObj.phone_number}</span></span>
                                    )}
                                    {photographerObj.secondary_phone_number && (
                                      <span>Secondary: <span className="font-mono font-bold text-blue-800">{photographerObj.secondary_phone_number}</span></span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase text-gray-500">Reference ID (Internal)</label>
                              <Input
                                value={newRowData.delivery_name}
                                onChange={(e) => setNewRowData({ ...newRowData, delivery_name: e.target.value })}
                                placeholder="Leave blank to auto-generate"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase text-gray-500">Footage Link</label>
                              <Input
                                value={newRowData.footage_link}
                                onChange={(e) => setNewRowData({ ...newRowData, footage_link: e.target.value })}
                                placeholder="https://drive.google.com/..."
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase text-gray-500">Reel Link</label>
                              <Input
                                value={newRowData.reel_link}
                                onChange={(e) => setNewRowData({ ...newRowData, reel_link: e.target.value })}
                                placeholder="https://instagram.com/reel/..."
                              />
                            </div>

                            {/* CONDITIONAL PAYMENT & PLATFORM PAYMENT FIELDS */}
                            {(() => {
                              const selectedShowroom = dealerships.find(d => d.id === newRowData.showroom_id);
                              if (!selectedShowroom) return null;

                              const selectedPhotographer = allUsers.find(p => p.id === newRowData.assigned_user_id);
                              const payoutModel = selectedPhotographer ? getPhotographerRawPayoutModel(selectedPhotographer.id, newRowData.date) : 'PERCENTAGE';
                              
                              if (selectedShowroom.paymentType === 'DEALER_PAID') {
                                return (
                                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                    <div className="space-y-2">
                                      <label className="text-xs font-semibold uppercase text-blue-500">Payment Amount (Optional)</label>
                                      <Input
                                        type="number"
                                        value={newRowData.received_amount}
                                        onChange={(e) => setNewRowData({ ...newRowData, received_amount: e.target.value })}
                                        placeholder="Defaults to dealership rate"
                                      />
                                    </div>
                                  </div>
                                );
                              }

                              const showPlatformPaymentFields = payoutModel === 'PERCENTAGE_15_DAILY';
                              const expectedPlatformAmount = Math.max(0, Math.round((Number(newRowData.received_amount || 0) - Number(newRowData.rapido_charge || 0)) * 0.15));

                              return (
                                <div className="space-y-4 border-t pt-4">
                                  {/* CUSTOMER PAYMENT SECTION */}
                                  <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-red-600">Customer Payment Proof</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase text-red-500">Payment Amount <span className="text-red-500">*</span></label>
                                        <Input
                                          type="number"
                                          value={newRowData.received_amount}
                                          onChange={(e) => setNewRowData({ ...newRowData, received_amount: e.target.value })}
                                          placeholder="Enter amount"
                                          className={!newRowData.received_amount ? 'border-red-300 bg-red-50' : ''}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase text-red-500">Customer Phone <span className="text-red-500">*</span></label>
                                        <Input
                                          value={newRowData.customer_phone}
                                          onChange={(e) => setNewRowData({ ...newRowData, customer_phone: e.target.value })}
                                          placeholder="Enter phone number"
                                          className={!newRowData.customer_phone ? 'border-red-300 bg-red-50' : ''}
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <label className="text-xs font-semibold uppercase text-red-500">Payment Screenshot <span className="text-red-500">*</span></label>
                                      <div className="flex gap-2 items-center">
                                        <Input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => setNewRowData({ ...newRowData, payment_screenshot: e.target.files?.[0] || null })}
                                          className="hidden"
                                          id="payment-upload"
                                        />
                                        <label
                                          htmlFor="payment-upload"
                                          className={`flex-1 cursor-pointer flex items-center justify-center gap-2 p-2 border-2 border-dashed rounded-md transition-colors ${
                                            !newRowData.payment_screenshot ? 'border-red-300 bg-red-50' : 'hover:bg-gray-50'
                                          }`}
                                        >
                                          <Upload className="h-4 w-4 text-red-400" />
                                          <span className="text-sm font-medium">
                                            {newRowData.payment_screenshot ? newRowData.payment_screenshot.name : 'Upload Payment Proof'}
                                          </span>
                                        </label>
                                      </div>
                                    </div>

                                    {/* Screenshot metadata */}
                                    <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-lg border">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-500">Scr. Date <span className="text-red-500">*</span></label>
                                        <Input
                                          type="date"
                                          value={newRowData.payment_screenshot_date}
                                          onChange={(e) => setNewRowData({ ...newRowData, payment_screenshot_date: e.target.value })}
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-500">Scr. Time <span className="text-red-500">*</span></label>
                                        <Input
                                          type="time"
                                          value={newRowData.payment_screenshot_time}
                                          onChange={(e) => setNewRowData({ ...newRowData, payment_screenshot_time: e.target.value })}
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-500">Scr. Amount <span className="text-red-500">*</span></label>
                                        <Input
                                          type="number"
                                          value={newRowData.payment_screenshot_amount}
                                          onChange={(e) => setNewRowData({ ...newRowData, payment_screenshot_amount: e.target.value })}
                                          className="h-8 text-xs"
                                          placeholder="On photo"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* PLATFORM PAYMENT SECTION (15% Payout Model Only) */}
                                  {showPlatformPaymentFields && (
                                    <div className="space-y-3 border-t pt-3">
                                      <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold uppercase text-green-700">Platform Payment (Yourphotocrew Cut)</h4>
                                        <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                          Expected Cut: ₹{expectedPlatformAmount} (15%)
                                        </span>
                                      </div>

                                      <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase text-green-600">Platform Payment Amount <span className="text-red-500">*</span></label>
                                        <Input
                                          type="number"
                                          value={newRowData.platform_payment_amount}
                                          onChange={(e) => setNewRowData({ ...newRowData, platform_payment_amount: e.target.value })}
                                          placeholder={`Expected: ₹${expectedPlatformAmount}`}
                                          className={!newRowData.platform_payment_amount || parseInt(newRowData.platform_payment_amount) !== expectedPlatformAmount ? 'border-red-300 bg-red-50 text-red-700 font-medium' : 'border-green-300 bg-green-50 text-green-700'}
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase text-green-600">Platform Payment Screenshot <span className="text-red-500">*</span></label>
                                        <div className="flex gap-2 items-center">
                                          <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setNewRowData({ ...newRowData, platform_payment_screenshot: e.target.files?.[0] || null })}
                                            className="hidden"
                                            id="platform-payment-upload"
                                          />
                                          <label
                                            htmlFor="platform-payment-upload"
                                            className={`flex-1 cursor-pointer flex items-center justify-center gap-2 p-2 border-2 border-dashed rounded-md transition-colors ${
                                              !newRowData.platform_payment_screenshot ? 'border-red-300 bg-red-50' : 'hover:bg-gray-50'
                                            }`}
                                          >
                                            <Upload className="h-4 w-4 text-green-500" />
                                            <span className="text-sm font-medium">
                                              {newRowData.platform_payment_screenshot ? newRowData.platform_payment_screenshot.name : 'Upload Platform Proof'}
                                            </span>
                                          </label>
                                        </div>
                                      </div>

                                      {/* Platform Screenshot metadata */}
                                      <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-lg border">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold uppercase text-gray-500">Scr. Date <span className="text-red-500">*</span></label>
                                          <Input
                                            type="date"
                                            value={newRowData.platform_payment_screenshot_date}
                                            onChange={(e) => setNewRowData({ ...newRowData, platform_payment_screenshot_date: e.target.value })}
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold uppercase text-gray-500">Scr. Time <span className="text-red-500">*</span></label>
                                          <Input
                                            type="time"
                                            value={newRowData.platform_payment_screenshot_time}
                                            onChange={(e) => setNewRowData({ ...newRowData, platform_payment_screenshot_time: e.target.value })}
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold uppercase text-gray-500">Scr. Amount <span className="text-red-500">*</span></label>
                                          <Input
                                            type="number"
                                            value={newRowData.platform_payment_screenshot_amount}
                                            onChange={(e) => setNewRowData({ ...newRowData, platform_payment_screenshot_amount: e.target.value })}
                                            className="h-8 text-xs"
                                            placeholder="On photo"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* RAPIDO FIELDS */}
                            {newRowData.assigned_user_id && (
                              <div className="space-y-4 border-t pt-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold uppercase text-blue-600">
                                    Rapido Charge (Cross-Cluster / Same-Cluster) <span className="text-red-500">*</span>
                                  </label>
                                  <Input
                                    type="number"
                                    value={newRowData.rapido_charge}
                                    onChange={(e) => setNewRowData({ ...newRowData, rapido_charge: e.target.value })}
                                    placeholder="Enter rapido charge (put 0 if none)"
                                    className={newRowData.rapido_charge === '' ? 'border-red-300 bg-red-50' : ''}
                                  />
                                </div>
                                {newRowData.rapido_charge !== '' && parseFloat(newRowData.rapido_charge) > 0 && (
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase text-red-500">
                                      Rapido Screenshot (MANDATORY)
                                    </label>
                                    <div className="flex gap-2 items-center">
                                      <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setNewRowData({ ...newRowData, rapido_screenshot: e.target.files?.[0] || null })}
                                        className="hidden"
                                        id="rapido-upload"
                                      />
                                      <label
                                        htmlFor="rapido-upload"
                                        className={`flex-1 cursor-pointer flex items-center justify-center gap-2 p-2 border-2 border-dashed rounded-md transition-colors ${
                                          !newRowData.rapido_screenshot ? 'border-red-300 bg-red-50' : 'hover:bg-gray-50'
                                        }`}
                                      >
                                        <Upload className="h-4 w-4 text-red-400" />
                                        <span className="text-sm font-medium">
                                          {newRowData.rapido_screenshot ? newRowData.rapido_screenshot.name : 'Upload Rapido Bill'}
                                        </span>
                                      </label>
                                    </div>
                                    
                                    {/* Rapido Screenshot metadata */}
                                    <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-lg border">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-500">Scr. Date <span className="text-red-500">*</span></label>
                                        <Input
                                          type="date"
                                          value={newRowData.rapido_screenshot_date}
                                          onChange={(e) => setNewRowData({ ...newRowData, rapido_screenshot_date: e.target.value })}
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-500">Scr. Time <span className="text-red-500">*</span></label>
                                        <Input
                                          type="time"
                                          value={newRowData.rapido_screenshot_time}
                                          onChange={(e) => setNewRowData({ ...newRowData, rapido_screenshot_time: e.target.value })}
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-500">Scr. Amount <span className="text-red-500">*</span></label>
                                        <Input
                                          type="number"
                                          value={newRowData.rapido_screenshot_amount}
                                          onChange={(e) => setNewRowData({ ...newRowData, rapido_screenshot_amount: e.target.value })}
                                          className="h-8 text-xs"
                                          placeholder="On photo"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* FRAUD DETECTION SECTION */}
                            {(() => {
                              const selectedShowroom = dealerships.find(d => d.id === newRowData.showroom_id);
                              const showroomCodeForFraud = selectedShowroom ? getShowroomCode(selectedShowroom.name) : '';
                              const fraudAlreadyVerified = !!(
                                newRowData.date &&
                                newRowData.assigned_user_id &&
                                showroomCodeForFraud &&
                                deliveries.some(d => 
                                  d.date === newRowData.date && 
                                  d.assigned_user_id === newRowData.assigned_user_id && 
                                  getShowroomCode(d.showroom_code) === showroomCodeForFraud && 
                                  (!!d.witness_phone || screenshots.some(s => s.delivery_id === d.id && s.type === 'FRAUD_DETECTION' && !s.deleted_at))
                                )
                              );

                              if (!newRowData.assigned_user_id || !newRowData.showroom_id || fraudAlreadyVerified) return null;

                              return (
                                <div className="space-y-4 border-t pt-4">
                                  <h4 className="text-xs font-bold uppercase text-amber-600">Fraud Detection Verification</h4>
                                  
                                  {newRowStandupCall && (
                                    <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-md flex justify-between items-center text-xs">
                                      <span className="text-gray-600 font-semibold">Morning Standup Confirmed Count:</span>
                                      <span className="font-bold text-amber-900 bg-amber-100/50 px-2 py-0.5 rounded border border-amber-200">
                                        {newRowStandupCall.status === 'CONFIRMED' 
                                          ? `${newRowStandupCall.confirmed_count} deliveries` 
                                          : 'On Leave'}
                                      </span>
                                    </div>
                                  )}
                                  
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase text-gray-500">
                                      Witness Phone Number (Dealership Team member) <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                      value={newRowData.witness_phone}
                                      onChange={(e) => setNewRowData({ ...newRowData, witness_phone: e.target.value })}
                                      placeholder="Enter witness phone number"
                                      className={!newRowData.witness_phone ? 'border-red-300 bg-red-50' : ''}
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <label className="text-xs font-semibold uppercase text-gray-500">
                                        Fraud Screenshot <span className="text-red-500">*</span>
                                      </label>
                                      <div className="flex gap-2 items-center">
                                        <Input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => setNewRowData({ ...newRowData, fraud_screenshot: e.target.files?.[0] || null })}
                                          className="hidden"
                                          id="fraud-upload"
                                        />
                                        <label
                                          htmlFor="fraud-upload"
                                          className={`flex-1 cursor-pointer flex items-center justify-center gap-2 p-2 border-2 border-dashed rounded-md transition-colors ${
                                            !newRowData.fraud_screenshot ? 'border-red-300 bg-red-50' : 'hover:bg-gray-50'
                                          }`}
                                        >
                                          <Upload className="h-4 w-4 text-amber-500" />
                                          <span className="text-xs font-medium truncate max-w-[120px]">
                                            {newRowData.fraud_screenshot ? newRowData.fraud_screenshot.name : 'Upload Screenshot'}
                                          </span>
                                        </label>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <label className="text-xs font-semibold uppercase text-gray-500">
                                        Witness Call Log Screenshot <span className="text-red-500">*</span>
                                      </label>
                                      <div className="flex gap-2 items-center">
                                        <Input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => setNewRowData({ ...newRowData, fraud_call_log_screenshot: e.target.files?.[0] || null })}
                                          className="hidden"
                                          id="fraud-call-log-upload"
                                        />
                                        <label
                                          htmlFor="fraud-call-log-upload"
                                          className={`flex-1 cursor-pointer flex items-center justify-center gap-2 p-2 border-2 border-dashed rounded-md transition-colors ${
                                            !newRowData.fraud_call_log_screenshot ? 'border-red-300 bg-red-50' : 'hover:bg-gray-50'
                                          }`}
                                        >
                                          <Upload className="h-4 w-4 text-amber-500" />
                                          <span className="text-xs font-medium truncate max-w-[120px]">
                                            {newRowData.fraud_call_log_screenshot ? newRowData.fraud_call_log_screenshot.name : 'Upload Call Log'}
                                          </span>
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          <DialogFooter className="px-6 py-4 border-t flex justify-end gap-2 bg-gray-50/50">
                            <Button variant="outline" onClick={handleCancelAddRow} disabled={isSubmitting}>Cancel</Button>
                            <Button onClick={handleSaveNewRow} disabled={isSubmitting}>
                              {isSubmitting ? 'Saving...' : 'Save Record'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableBody>
                  </Table>
                </div>


                {/* Add New Row Button */}
                <div className="mt-4">
                  <Button onClick={handleStartAddRow} variant="outline" className="w-full gap-2 border-green-200 text-green-700 hover:bg-green-50">
                    <Plus className="h-4 w-4" />
                    Add New Delivery Row
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Photographer Audit view */}
          {viewMode === 'audit' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Photographer Daily Audit</h2>
                  <p className="text-sm text-gray-500">Unified verification workspace for morning standups, deliveries, and fraud checks</p>
                </div>
              </div>

              {/* Selector Card */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date Selector */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Audit Date</label>
                      <Input
                        type="date"
                        value={spreadSheetDate}
                        onChange={(e) => {
                          setSpreadSheetDate(e.target.value);
                        }}
                        className="h-9"
                      />
                    </div>

                    {/* Photographer Selector */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Audited Photographer</label>
                      <Select 
                        value={selectedPhotographer} 
                        onValueChange={(v) => {
                          setSelectedPhotographer(v);
                          // reset standup form on photographer change
                          setStandupForm({
                            status: 'CONFIRMED',
                            confirmed_count: '',
                            screenshotFile: null,
                            previewUrl: '',
                            submitting: false
                          });
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select Photographer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Select Photographer...</SelectItem>
                          {cityIsolatedPhotographers.filter(p => p.active).map(p => {
                            const isPHandedOver = handoverLogs.some(l => l.target_id === p.id);
                            return (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}{isPHandedOver ? ' (Handed Over)' : ''}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Super Admin Handover Queue */}
              {user.role === 'SUPER_ADMIN' && allHandoverLogs.length > 0 && (
                <Card className="border-orange-200 bg-orange-50/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-orange-500 animate-pulse" />
                      Pending Handover Audits ({allHandoverLogs.length})
                    </CardTitle>
                    <CardDescription className="text-xs">
                      The following daily audit tasks were handed over to you by other admins. Click to review.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {allHandoverLogs.map((log) => {
                        const adminObj = allUsers.find(u => u.id === log.actor_user_id);
                        const adminName = adminObj ? adminObj.name : 'Another Admin';
                        const taskName = log.metadata?.task_type === 'STANDUP' 
                          ? 'Morning Standup' 
                          : log.metadata?.task_type === 'FRAUD' 
                          ? 'Fraud Audit' 
                          : log.metadata?.task_type === 'MISSED_UPDATE'
                          ? 'Missed Update'
                          : 'Deliveries';
                        
                        return (
                          <div 
                            key={log.id} 
                            onClick={() => {
                              setSelectedPhotographer(log.target_id);
                              setSpreadSheetDate(log.metadata?.date);
                              toast.info(`Loaded ${log.metadata?.photographer_name} for ${log.metadata?.date}`);
                            }}
                            className="p-3 bg-white hover:bg-orange-50 border border-gray-100 rounded-xl shadow-sm cursor-pointer transition-all flex flex-col gap-1 text-xs group"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-gray-800 group-hover:text-orange-600 truncate">{log.metadata?.photographer_name}</span>
                              <Badge className="bg-orange-100 text-orange-700 font-bold text-[9px] border-0 px-1.5 py-0.5">{taskName}</Badge>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                              <span>Date: {log.metadata?.date}</span>
                              <span>By: {adminName}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Main Content Areas */}
              {selectedPhotographer && selectedPhotographer !== 'all' ? (
                <div className="space-y-6">
                  
                  {/* Task 1: Morning Standup Call Card */}
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-bold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-blue-500" />
                          Task 1: Morning Standup Call Verification
                        </span>
                        {currentStandupCall ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 font-semibold border-green-200">
                            Verified & Saved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500 bg-gray-50">
                            Pending
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Secondary Contact Number Display */}
                      {selectedPhotographerObj && (selectedPhotographerObj.phone_number || selectedPhotographerObj.secondary_phone_number) && (
                        <div className="mb-4 p-3 bg-blue-50/60 border border-blue-100 rounded-lg flex items-center justify-between text-xs">
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-700">
                            <span className="font-bold text-blue-900">Photographer Contact:</span>
                            {selectedPhotographerObj.phone_number && (
                              <span>Primary: <span className="font-mono font-bold text-gray-900">{selectedPhotographerObj.phone_number}</span></span>
                            )}
                            {selectedPhotographerObj.secondary_phone_number && (
                              <span>Secondary: <span className="font-mono font-bold text-blue-800">{selectedPhotographerObj.secondary_phone_number}</span></span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Handover Warning Banner */}
                      {handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'STANDUP') && (
                        <div className="p-3 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg flex items-center gap-2 mb-4 font-semibold text-xs">
                          <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                          <span>This standup task has been handed over to Super Admin. Editing is locked.</span>
                        </div>
                      )}

                      {standupLoading ? (
                        <div className="py-6 text-center text-xs text-gray-400">Loading standup details...</div>
                      ) : currentStandupCall ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border">
                          <div className="space-y-2 text-sm text-gray-700">
                            <div className="flex justify-between border-b pb-1.5">
                              <span className="text-gray-500">Standup Status:</span>
                              <span className={`font-bold ${currentStandupCall.status === 'CONFIRMED' ? 'text-green-600' : 'text-blue-600'}`}>
                                {currentStandupCall.status === 'CONFIRMED' ? 'CONFIRMED DELIVERIES' : 'ON LEAVE'}
                              </span>
                            </div>
                            {currentStandupCall.status === 'CONFIRMED' && (
                              <div className="flex justify-between border-b pb-1.5">
                                <span className="text-gray-500">Confirmed Deliveries Count:</span>
                                <span className="font-bold text-gray-900">{currentStandupCall.confirmed_count}</span>
                              </div>
                            )}
                            <div className="flex justify-between border-b pb-1.5">
                              <span className="text-gray-500">Verified Date:</span>
                              <span className="font-medium">{new Date(currentStandupCall.created_at).toLocaleDateString('en-IN')}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-center justify-center p-2 bg-white rounded border">
                            <span className="text-xs text-gray-500 mb-1.5 font-semibold">Call Log Screenshot</span>
                            <a 
                              href={currentStandupCall.call_log_screenshot_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Eye className="h-3.5 w-3.5" /> View Call Log Screenshot
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Radio Options */}
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-gray-700 block">Select Standup Status</label>
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer bg-white p-3 border rounded-lg hover:bg-gray-50 flex-1">
                                  <input 
                                    type="radio" 
                                    name="standup-status" 
                                    checked={standupForm.status === 'CONFIRMED'}
                                    disabled={handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'STANDUP') && user.role === 'ADMIN'}
                                    onChange={() => setStandupForm(prev => ({ ...prev, status: 'CONFIRMED' }))}
                                    className="h-4 w-4 text-blue-600"
                                  />
                                  <div className="text-xs">
                                    <div className="font-semibold text-gray-800">Confirmed Count</div>
                                    <div className="text-gray-400 text-[10px]">Photographer is working today</div>
                                  </div>
                                </label>
                                
                                <label className="flex items-center gap-2 cursor-pointer bg-white p-3 border rounded-lg hover:bg-gray-50 flex-1">
                                  <input 
                                    type="radio" 
                                    name="standup-status" 
                                    checked={standupForm.status === 'LEAVE'}
                                    disabled={handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'STANDUP') && user.role === 'ADMIN'}
                                    onChange={() => setStandupForm(prev => ({ ...prev, status: 'LEAVE' }))}
                                    className="h-4 w-4 text-blue-600"
                                  />
                                  <div className="text-xs">
                                    <div className="font-semibold text-gray-800">I'm on Leave</div>
                                    <div className="text-gray-400 text-[10px]">Photographer is absent today</div>
                                  </div>
                                </label>
                              </div>

                              {/* Leave Verification Alert */}
                              {standupForm.status === 'LEAVE' && (
                                <div className="mt-2">
                                  {leaves.some(l => l.photographerId === selectedPhotographer && l.date === spreadSheetDate) ? (
                                    <div className="p-2.5 bg-green-50 border border-green-200 text-green-700 rounded text-xs font-semibold">
                                      CRM Check: Leave record is verified for today.
                                    </div>
                                  ) : (
                                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs font-semibold flex items-center gap-1.5">
                                      <AlertTriangle className="h-4 w-4 shrink-0" />
                                      Leave is not applied in CRM! Cannot submit standup as absent.
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Deliveries Count Textbox */}
                              {standupForm.status === 'CONFIRMED' && (
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-gray-700 block">
                                    Confirmed Deliveries Count <span className="text-red-500">*</span>
                                  </label>
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="Enter expected count today"
                                    value={standupForm.confirmed_count}
                                    disabled={handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'STANDUP') && user.role === 'ADMIN'}
                                    onChange={(e) => setStandupForm(prev => ({ ...prev, confirmed_count: e.target.value }))}
                                    className="h-9"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Screenshot Upload Block */}
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-700 block">
                                Call Log Screenshot <span className="text-red-500">*</span>
                              </label>
                              {standupForm.previewUrl ? (
                                <div className="p-3 bg-gray-50 border rounded-lg flex items-center justify-between">
                                  <span className="text-xs font-medium text-green-700 truncate max-w-[200px]">
                                    📷 {standupForm.screenshotFile?.name}
                                  </span>
                                  {!(handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'STANDUP') && user.role === 'ADMIN') && (
                                    <Button 
                                      variant="ghost" 
                                      className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                                      onClick={() => setStandupForm(prev => ({ ...prev, screenshotFile: null, previewUrl: '' }))}
                                    >
                                      Remove
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                                  handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'STANDUP') && user.role === 'ADMIN' ? 'pointer-events-none opacity-50' : ''
                                }`}>
                                  <Upload className="h-6 w-6 text-gray-400 mb-1.5" />
                                  <span className="text-xs font-semibold text-gray-600">Upload Call Log Image</span>
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    disabled={handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'STANDUP') && user.role === 'ADMIN'}
                                    onChange={handleStandupFileChange}
                                  />
                                </label>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-3">
                            {user.role === 'ADMIN' && !handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'STANDUP') && (
                              <Button
                                onClick={async () => {
                                  // 1. Check if call log is uploaded
                                  const hasCallLog = !!currentStandupCall?.call_log_screenshot_url || !!standupForm.screenshotFile;
                                  if (!hasCallLog) {
                                    toast.error('You must upload a call log screenshot first before handing over to Super Admin');
                                    return;
                                  }

                                  try {
                                    setStandupForm(prev => ({ ...prev, submitting: true }));
                                    
                                    let finalUrl = currentStandupCall?.call_log_screenshot_url || '';
                                    
                                    // If a new file is selected, upload it first
                                    if (standupForm.screenshotFile) {
                                      const path = `standup_calls/${selectedPhotographer}_${spreadSheetDate}_${Date.now()}.jpg`;
                                      finalUrl = await screenshotsDb.uploadScreenshotFile(standupForm.screenshotFile, path, supabase);
                                      
                                      // Save or update standup call record
                                      await standupDb.submitStandupCall({
                                        photographer_id: selectedPhotographer,
                                        date: spreadSheetDate,
                                        status: standupForm.status || currentStandupCall?.status || 'PENDING',
                                        confirmed_count: standupForm.confirmed_count ? parseInt(standupForm.confirmed_count) : (currentStandupCall?.confirmed_count || null),
                                        call_log_screenshot_url: finalUrl
                                      }, supabase);
                                      
                                      // Refresh state
                                      const updatedCall = await standupDb.getStandupCall(selectedPhotographer, spreadSheetDate);
                                      setCurrentStandupCall(updatedCall);
                                      if (updatedCall) {
                                        setAllStandupCalls(prev => {
                                          const filtered = prev.filter(c => c.id !== updatedCall.id);
                                          return [...filtered, updatedCall];
                                        });
                                      }
                                    }

                                    // Perform handover
                                    await handleHandoverToSuperAdmin('STANDUP');
                                  } catch (err) {
                                    console.error('Failed to submit standup call log for handover:', err);
                                    toast.error('Failed to upload call log for handover');
                                  } finally {
                                    setStandupForm(prev => ({ ...prev, submitting: false }));
                                  }
                                }}
                                variant="outline"
                                className="flex-1 border-orange-200 text-orange-600 hover:bg-orange-50 font-semibold text-sm animate-pulse"
                                disabled={!currentStandupCall?.call_log_screenshot_url && !standupForm.screenshotFile}
                              >
                                Handover to super admin
                              </Button>
                            )}

                            {(!handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'STANDUP') || user.role === 'SUPER_ADMIN') && (
                              <Button
                                onClick={async () => {
                                  if (standupForm.submitting) return;
                                  // Validation
                                  if (!standupForm.screenshotFile) {
                                    toast.error('Call log screenshot is mandatory');
                                    return;
                                  }
                                  if (standupForm.status === 'CONFIRMED' && !standupForm.confirmed_count) {
                                    toast.error('Please enter confirmed deliveries count');
                                    return;
                                  }
                                  if (standupForm.status === 'LEAVE') {
                                    const hasLeave = leaves.some(l => l.photographerId === selectedPhotographer && l.date === spreadSheetDate);
                                    if (!hasLeave) {
                                      toast.error('Cannot submit. Leave has not been applied in the CRM for today.');
                                      return;
                                    }
                                  }

                                  setStandupForm(prev => ({ ...prev, submitting: true }));
                                  try {
                                    const client = supabase;
                                    // Upload file
                                    const path = `standup_call_logs/${selectedPhotographer}/${spreadSheetDate}_${Date.now()}.jpg`;
                                    const url = await screenshotsDb.uploadScreenshotFile(standupForm.screenshotFile, path, client);
                                    
                                    await standupDb.createStandupCall({
                                      photographer_id: selectedPhotographer,
                                      date: spreadSheetDate,
                                      status: standupForm.status,
                                      confirmed_count: standupForm.status === 'CONFIRMED' ? parseInt(standupForm.confirmed_count) : null,
                                      call_log_screenshot_url: url
                                    }, client);

                                    toast.success('Standup call verified and submitted!');
                                    
                                    // Refresh standup details
                                    const call = await standupDb.getStandupCall(selectedPhotographer, spreadSheetDate);
                                    setCurrentStandupCall(call);
                                    if (call) {
                                      setAllStandupCalls(prev => {
                                        const filtered = prev.filter(c => c.id !== call.id);
                                        return [...filtered, call];
                                      });
                                    }
                                  } catch (err) {
                                    console.error('Failed to submit standup call:', err);
                                    toast.error('Failed to submit standup verification');
                                  } finally {
                                    setStandupForm(prev => ({ ...prev, submitting: false }));
                                  }
                                }}
                                disabled={
                                  standupForm.submitting || 
                                  !standupForm.screenshotFile || 
                                  (standupForm.status === 'CONFIRMED' && !standupForm.confirmed_count) ||
                                  (standupForm.status === 'LEAVE' && !leaves.some(l => l.photographerId === selectedPhotographer && l.date === spreadSheetDate))
                                }
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
                              >
                                {standupForm.submitting ? 'Submitting...' : 'Submit Standup Verification'}
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {showTask2And3 && (
                    <>
                      {/* Task 2: Fraud Detection Audits */}
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b pb-2">
                            <ShieldCheck className="h-5 w-5 text-amber-600" />
                            Task 2: Fraud Detection Audits
                          </h3>

                          {/* Task 2A: Dealership Witness Call Audits */}
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <ShieldCheck className="h-4.5 w-4.5 text-amber-500" />
                                Task 2A: Dealership Witness Call Audits
                              </h4>
                              {/* Handover to super admin is not relevant for Task 2A (Dealership Audits) */}
                            </div>

                            {handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'FRAUD') && (
                              <div className="p-3 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg flex items-center gap-2 font-semibold text-xs">
                                <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                                <span>This fraud audit task has been handed over to Super Admin. Editing is locked.</span>
                              </div>
                            )}

                            {uniqueShowroomCodesForPhotographer.length === 0 ? (
                              <Card>
                                <CardContent className="py-6 text-center text-gray-500 text-xs italic">
                                  No deliveries completed today to verify.
                                </CardContent>
                              </Card>
                            ) : (
                              uniqueShowroomCodesForPhotographer.map(showroomCode => (
                                <FraudAuditShowroomCard
                                  key={showroomCode}
                                  showroomCode={showroomCode}
                                  selectedPhotographer={selectedPhotographer}
                                  spreadSheetDate={spreadSheetDate}
                                  deliveries={deliveries}
                                  screenshots={screenshots}
                                  dealerships={dealerships}
                                  currentStandupCall={currentStandupCall}
                                  handoverLogs={handoverLogs}
                                  user={user}
                                  setCurrentImageIndex={setCurrentImageIndex}
                                  setGalleryViewMode={setGalleryViewMode}
                                  handleTriggerSheetSync={handleTriggerSheetSync}
                                  loadData={loadData}
                                />
                              ))
                            )}
                          </div>

                          {/* Task 2B: Customer Payment Fraud Audits */}
                          <div className="space-y-4 border-t pt-4 mt-6">
                            <div className="flex justify-between items-center">
                              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <ShieldAlert className="h-4.5 w-4.5 text-orange-500" />
                                Task 2B: Customer Payment Fraud Audits
                              </h4>
                              {user.role === 'ADMIN' && !handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'FRAUD') && customerPaidDeliveries.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7 border-orange-400 text-orange-600 hover:bg-orange-50 font-semibold"
                                  disabled={customerPaidDeliveries.some(d => !screenshots.some(s => s.delivery_id === d.id && s.type === 'CUSTOMER_CALL_LOG' && !s.deleted_at))}
                                  onClick={async () => {
                                    if (!selectedPhotographer || !spreadSheetDate) return;
                                    try {
                                      await supabase.from('log_events').insert({
                                        type: 'ADMIN_AUDIT_HANDOVER_TO_SUPER_ADMIN',
                                        actor_user_id: user.id,
                                        target_id: selectedPhotographer,
                                        metadata: { 
                                          date: spreadSheetDate, 
                                          task_type: 'FRAUD'
                                        }
                                      });
                                      toast.success('Task 2B handed over to Super Admin');
                                      fetchHandoverAndSentLogs();
                                    } catch (e) {
                                      toast.error('Failed to handover');
                                    }
                                  }}
                                >
                                  Handover to super admin
                                </Button>
                              )}
                            </div>

                            {handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'FRAUD') && (
                              <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-800">
                                <ShieldCheck className="h-4 w-4 text-amber-600" />
                                <span>⚠️ This customer fraud audit task has been handed over to Super Admin and is now read-only.</span>
                              </div>
                            )}

                            {customerPaidDeliveries.length === 0 ? (
                              <Card>
                                <CardContent className="py-6 text-center text-gray-500 text-xs italic">
                                  No customer-paid deliveries to verify for fraud.
                                </CardContent>
                              </Card>
                            ) : (
                              <div className="grid grid-cols-1 gap-4">
                                {customerPaidDeliveries.map(d => {
                                  const callLogScr = screenshots.find(s => s.delivery_id === d.id && s.type.startsWith('CUSTOMER_CALL_LOG') && !s.deleted_at);
                                  const confirmedAmount = callLogScr ? callLogScr.type.split(':')[1] || '' : '';
                                  
                                  const isVerified = screenshots.some(s => {
                                    if (s.delivery_id !== d.id || !s.type.startsWith('CUSTOMER_CALL_LOG') || s.deleted_at) return false;
                                    const confirmedVal = s.type.split(':')[1] || '';
                                    return parseFloat(confirmedVal) === parseFloat(d.received_amount || '0');
                                  });

                                  const dealership = dealerships.find(dl => getShowroomCode(dl.name) === getShowroomCode(d.showroom_code));
                                  const displayShowroomName = dealership ? dealership.name : d.showroom_code;
                                  const mapping = mappings.find(m => m.dealershipId === dealership?.id);
                                  const cluster = clusters.find(c => c.id === mapping?.clusterId);
                                  const displayClusterName = cluster ? cluster.name : 'Unknown Cluster';

                                  const isLocked = handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'FRAUD') || user?.role !== 'ADMIN';

                                  return (
                                    <Card key={d.id} className="border-l-4 border-l-orange-500">
                                      <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-bold flex items-center justify-between">
                                          <span>{d.delivery_name}</span>
                                          {isVerified ? (
                                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 font-semibold">
                                              Audited & Verified
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200">
                                              Pending
                                            </Badge>
                                          )}
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-gray-50 p-3 rounded border text-xs items-center">
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-gray-500 font-medium">Dealership:</span>
                                            <span className="font-bold text-gray-900 truncate">{displayShowroomName}</span>
                                          </div>
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-gray-500 font-medium">Cluster:</span>
                                            <span className="font-bold text-gray-900 truncate">{displayClusterName}</span>
                                          </div>
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-gray-500 font-medium">Customer Phone:</span>
                                            <span className="font-mono font-bold text-blue-900">{d.customer_phone || 'N/A'}</span>
                                          </div>
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-gray-500 font-medium">Collection (Send Update):</span>
                                            <span className="font-bold text-green-700">₹{d.received_amount || '0'}</span>
                                          </div>
                                          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
                                            <span className="text-gray-500 font-medium uppercase text-[10px]">Confirmed Amount *</span>
                                            {isLocked ? (
                                              <span className="font-bold text-blue-700">{confirmedAmount ? `₹${confirmedAmount}` : 'N/A'}</span>
                                            ) : (
                                              <Input
                                                type="number"
                                                placeholder="Enter amount"
                                                value={confirmedAmounts[d.id] ?? confirmedAmount}
                                                onChange={async (e) => {
                                                  const val = e.target.value;
                                                  setConfirmedAmounts(prev => ({ ...prev, [d.id]: val }));
                                                  
                                                  // Auto-save to Supabase if screenshot already exists!
                                                  if (callLogScr) {
                                                    try {
                                                      await supabase
                                                        .from('screenshots')
                                                        .update({ type: `CUSTOMER_CALL_LOG:${val}` })
                                                        .eq('id', callLogScr.id);
                                                      
                                                      // Update screenshots state locally
                                                      setScreenshots(prev => 
                                                        prev.map(s => s.id === callLogScr.id ? { ...s, type: `CUSTOMER_CALL_LOG:${val}` } : s)
                                                      );
                                                      toast.success('Confirmed amount updated!');
                                                    } catch (err) {
                                                      console.error('Failed to update confirmed amount:', err);
                                                      toast.error('Failed to update confirmed amount');
                                                    }
                                                  }
                                                }}
                                                className={`h-7 text-xs ${!confirmedAmount && !(confirmedAmounts[d.id]) ? 'border-red-300 bg-red-50' : ''}`}
                                              />
                                            )}
                                          </div>
                                        </div>

                                        {/* Call Log Screenshot Uploader / Viewer */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="space-y-1.5">
                                            <span className="text-xs font-semibold text-gray-600 block">Customer Call Log Screenshot:</span>
                                            {callLogScr ? (
                                              <div className="relative group border rounded-lg overflow-hidden bg-gray-100 h-40 flex items-center justify-center">
                                                <img 
                                                  src={callLogScr.file_url} 
                                                  alt="customer call log" 
                                                  className="max-h-full object-contain cursor-pointer"
                                                  onClick={() => {
                                                    window.open(callLogScr.file_url, '_blank');
                                                  }}
                                                />
                                              </div>
                                            ) : (
                                              <div className="h-40 border-2 border-dashed rounded-lg bg-gray-50 flex flex-col items-center justify-center text-xs text-gray-400">
                                                No customer call log uploaded
                                              </div>
                                            )}
                                          </div>

                                          {!isLocked && (
                                            <div className="flex flex-col justify-center space-y-2">
                                              <span className="text-xs font-semibold text-gray-600 block">Upload Call Log:</span>
                                              <Input
                                                type="file"
                                                accept="image/*"
                                                disabled={!(confirmedAmounts[d.id] ?? confirmedAmount) || parseFloat(confirmedAmounts[d.id] ?? confirmedAmount) <= 0}
                                                onChange={async (e) => {
                                                  const file = e.target.files?.[0];
                                                  const amount = confirmedAmounts[d.id] ?? confirmedAmount;
                                                  if (!file || !amount) return;
                                                  try {
                                                    const path = `customer_fraud_logs/${d.id}_${Date.now()}.jpg`;
                                                    const url = await screenshotsDb.uploadScreenshotFile(file, path, supabase);
                                                    const scr = await screenshotsDb.createScreenshot({
                                                      delivery_id: d.id,
                                                      user_id: selectedPhotographer,
                                                      type: `CUSTOMER_CALL_LOG:${amount}`,
                                                      file_url: url,
                                                      thumbnail_url: url,
                                                      deleted_at: null
                                                    }, supabase);
                                                    if (scr) {
                                                      setScreenshots(prev => [scr, ...prev]);
                                                      toast.success('Customer call log uploaded successfully!');
                                                    }
                                                  } catch (err) {
                                                    console.error(err);
                                                    toast.error('Failed to upload customer call log');
                                                  }
                                                }}
                                                className="text-xs"
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                  {/* Task 3: Deliveries Verification Cards */}
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-gray-900 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        Task 3: Deliveries Verification checklist
                      </span>
                      {user.role === 'ADMIN' && !handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'DELIVERIES') && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleTask3CallLogChange}
                            className="hidden"
                            id="task3-calllog-upload"
                            disabled={uploadingTask3CallLog}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 border-blue-200 text-blue-600 hover:bg-blue-50 font-semibold cursor-pointer"
                            asChild
                            disabled={uploadingTask3CallLog}
                          >
                            <label htmlFor="task3-calllog-upload">
                              {uploadingTask3CallLog 
                                ? 'Uploading...' 
                                : task3CallLogUrl 
                                  ? '✓ Call Log Uploaded' 
                                  : 'Tried solving with photographer? Call log Upload'}
                            </label>
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 border-orange-400 text-orange-600 hover:bg-orange-50 font-semibold"
                            disabled={!task3CallLogUrl}
                            onClick={async () => {
                              if (!selectedPhotographer || !spreadSheetDate) return;
                              try {
                                await supabase.from('log_events').insert({
                                  type: 'ADMIN_AUDIT_HANDOVER_TO_SUPER_ADMIN',
                                  actor_user_id: user.id,
                                  target_id: selectedPhotographer,
                                  metadata: { 
                                    date: spreadSheetDate, 
                                    task_type: 'DELIVERIES',
                                    call_log_screenshot_url: task3CallLogUrl
                                  }
                                });
                                toast.success('Task 3 handed over to Super Admin');
                                fetchHandoverAndSentLogs();
                              } catch (e) {
                                toast.error('Failed to handover');
                              }
                            }}
                          >
                            Handover to super admin
                          </Button>
                        </div>
                      )}
                    </h3>
                    {handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'DELIVERIES') && (() => {
                      const logObj = handoverLogs.find(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'DELIVERIES');
                      const callLogUrl = logObj?.metadata?.call_log_screenshot_url;
                      return (
                        <div className="flex flex-col gap-3 rounded-md bg-amber-50 border border-amber-300 px-4 py-3 text-xs text-amber-800">
                          <div className="flex items-center gap-2 font-semibold">
                            <ShieldCheck className="h-4 w-4 text-amber-600" />
                            <span>⚠️ This task has been handed over to Super Admin and is now read-only.</span>
                          </div>
                          {callLogUrl && (
                            <div className="mt-1 space-y-1.5">
                              <span className="font-semibold block text-[11px] text-amber-900">Admin-Uploaded Call Log Screenshot (Tried solving with photographer):</span>
                              <div className="relative group border border-amber-200 rounded-lg overflow-hidden bg-white max-w-sm h-40 flex items-center justify-center">
                                <img 
                                  src={callLogUrl} 
                                  alt="admin call log screenshot" 
                                  className="max-h-full object-contain cursor-pointer"
                                  onClick={() => {
                                    window.open(callLogUrl, '_blank');
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {selectedPhotographerObj && (selectedPhotographerObj.phone_number || selectedPhotographerObj.secondary_phone_number) && (
                      <div className="mb-4 p-3 bg-blue-50/60 border border-blue-100 rounded-lg flex items-center justify-between text-xs">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-700">
                          <span className="font-bold text-blue-900">Photographer Contact:</span>
                          {selectedPhotographerObj.phone_number && (
                            <span>Primary: <span className="font-mono font-bold text-gray-900">{selectedPhotographerObj.phone_number}</span></span>
                          )}
                          {selectedPhotographerObj.secondary_phone_number && (
                            <span>Secondary: <span className="font-mono font-bold text-blue-800">{selectedPhotographerObj.secondary_phone_number}</span></span>
                          )}
                        </div>
                      </div>
                    )}

                    {photographerDeliveries.length === 0 ? (
                      <Card>
                        <CardContent className="py-6 text-center text-gray-500 text-xs italic">
                          No deliveries found.
                        </CardContent>
                      </Card>
                    ) : (
                      photographerDeliveries.map(d => {
                        const inputs = verificationInputs[d.id] || {
                          payment_date: '',
                          payment_time: '',
                          payment_amount: '',
                          platform_date: '',
                          platform_time: '',
                          platform_amount: '',
                          rapido_date: '',
                          rapido_time: '',
                          rapido_amount: '',
                          witness_phone: '',
                        };

                        const updateInput = (field: keyof typeof inputs, val: string) => {
                          setVerificationInputs(prev => ({
                            ...prev,
                            [d.id]: {
                              ...prev[d.id],
                              [field]: val
                            }
                          }));
                        };

                        // Check status
                        const isCustomerPaid = d.payment_type === 'CUSTOMER_PAID';
                        const photographerObj = allUsers.find(p => p.id === selectedPhotographer);
                        const is15PercentModel = photographerObj && getPhotographerRawPayoutModel(selectedPhotographer, d.date) === 'PERCENTAGE_15_DAILY';
                        const hasRapido = d.rapido_charge != null && d.rapido_charge > 0;

                        const isCustomerPayVerified = !isCustomerPaid || (!!d.payment_screenshot_date && !!d.payment_screenshot_time && !!d.payment_screenshot_amount);
                        const isPlatformPayVerified = !is15PercentModel || !isCustomerPaid || (!!d.platform_payment_screenshot_date && !!d.platform_payment_screenshot_time && !!d.platform_payment_screenshot_amount);
                        const isRapidoVerified = !hasRapido || (!!d.rapido_screenshot_date && !!d.rapido_screenshot_time && !!d.rapido_screenshot_amount);

                        const isDeliveryAudited = isCustomerPayVerified && isPlatformPayVerified && isRapidoVerified;

                        // Grab screenshots
                        const paymentScr = screenshots.find(s => s.delivery_id === d.id && s.type === 'PAYMENT' && !s.deleted_at);
                        const platformScr = screenshots.find(s => s.delivery_id === d.id && s.type === 'PLATFORM_PAYMENT' && !s.deleted_at);
                        const rapidoScr = screenshots.find(s => s.delivery_id === d.id && s.type === 'RAPIDO' && !s.deleted_at);

                        return (
                          <Card key={d.id} className="border-l-4 border-l-green-600">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-bold flex items-center justify-between">
                                <div>
                                  <span className="text-gray-900">{d.delivery_name}</span>
                                  <span className="text-xs text-gray-500 font-normal ml-2">({d.showroom_code})</span>
                                </div>
                                {isDeliveryAudited ? (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 font-semibold">
                                    Audited & Verified
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                                    Pending Verification
                                  </Badge>
                                )}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                              {/* 1. Customer Payment Auditing */}
                              {isCustomerPaid && (
                                <div className="border-b pb-4 space-y-4">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">1. Customer Payment Screenshot</h4>
                                    {isCustomerPayVerified && <Badge className="bg-green-50 text-green-700 border border-green-200 font-medium">Verified</Badge>}
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {paymentScr ? (
                                      <div className="flex flex-col items-center bg-gray-50 border rounded-lg p-2 h-44 justify-center relative group">
                                        <img src={paymentScr.file_url} className="max-h-full object-contain cursor-pointer" onClick={() => {
                                          setCurrentImageIndex(screenshots.indexOf(paymentScr));
                                          setGalleryViewMode('single');
                                        }} alt="payment" />
                                        <span className="absolute bottom-1 bg-black/60 text-[10px] text-white px-2 py-0.5 rounded font-mono">Collection: ₹{d.received_amount}</span>
                                      </div>
                                    ) : (
                                      <div className="h-44 border border-dashed rounded-lg bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                                        No screenshot uploaded
                                      </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Scr. Date *</label>
                                        <Input
                                          type="text"
                                          placeholder="DD-MM-YYYY"
                                          value={inputs.payment_date}
                                          onChange={(e) => updateInput('payment_date', e.target.value)}
                                          disabled={isCustomerPayVerified || (handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'DELIVERIES') && user.role === 'ADMIN')}
                                          className="h-8 text-xs font-semibold"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Scr. Time *</label>
                                        <Input
                                          type="text"
                                          placeholder="HH:MM"
                                          value={inputs.payment_time}
                                          onChange={(e) => updateInput('payment_time', e.target.value)}
                                          disabled={isCustomerPayVerified || (handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'DELIVERIES') && user.role === 'ADMIN')}
                                          className="h-8 text-xs font-semibold"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Scr. Amount *</label>
                                        <Input
                                          type="text"
                                          placeholder="Amount ₹"
                                          value={inputs.payment_amount}
                                          onChange={(e) => updateInput('payment_amount', e.target.value)}
                                          disabled={isCustomerPayVerified || (handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'DELIVERIES') && user.role === 'ADMIN')}
                                          className="h-8 text-xs font-semibold font-mono"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 2. Platform Payment Auditing */}
                              {isCustomerPaid && is15PercentModel && (
                                <div className="border-b pb-4 space-y-4">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">2. Yourphotocrew Platform Payment Screenshot</h4>
                                    {isPlatformPayVerified && <Badge className="bg-green-50 text-green-700 border border-green-200 font-medium">Verified</Badge>}
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {platformScr ? (
                                      <div className="flex flex-col items-center bg-gray-50 border rounded-lg p-2 h-44 justify-center relative">
                                        <img src={platformScr.file_url} className="max-h-full object-contain cursor-pointer" onClick={() => {
                                          setCurrentImageIndex(screenshots.indexOf(platformScr));
                                          setGalleryViewMode('single');
                                        }} alt="platform payment" />
                                        <span className="absolute bottom-1 bg-black/60 text-[10px] text-white px-2 py-0.5 rounded font-mono">
                                          Expected cut (15%): ₹{Math.max(0, Math.round((parseFloat(String(d.received_amount || '0')) - parseFloat(String(d.rapido_charge || '0'))) * 0.15))}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="h-44 border border-dashed rounded-lg bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                                        No screenshot uploaded
                                      </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Scr. Date *</label>
                                        <Input
                                          type="text"
                                          placeholder="DD-MM-YYYY"
                                          value={inputs.platform_date}
                                          onChange={(e) => updateInput('platform_date', e.target.value)}
                                          disabled={isPlatformPayVerified || (handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'DELIVERIES') && user.role === 'ADMIN')}
                                          className="h-8 text-xs font-semibold"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Scr. Time *</label>
                                        <Input
                                          type="text"
                                          placeholder="HH:MM"
                                          value={inputs.platform_time}
                                          onChange={(e) => updateInput('platform_time', e.target.value)}
                                          disabled={isPlatformPayVerified || (handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'DELIVERIES') && user.role === 'ADMIN')}
                                          className="h-8 text-xs font-semibold"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Scr. Amount *</label>
                                        <Input
                                          type="text"
                                          placeholder="Amount ₹"
                                          value={inputs.platform_amount}
                                          onChange={(e) => updateInput('platform_amount', e.target.value)}
                                          disabled={isPlatformPayVerified || (handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'DELIVERIES') && user.role === 'ADMIN')}
                                          className="h-8 text-xs font-semibold font-mono"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 3. Rapido Auditing */}
                              {hasRapido && (
                                <div className="border-b pb-4 space-y-4">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">3. Rapido Ride Screenshot</h4>
                                    {isRapidoVerified && <Badge className="bg-green-50 text-green-700 border border-green-200 font-medium">Verified</Badge>}
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {rapidoScr ? (
                                      <div className="flex flex-col items-center bg-gray-50 border rounded-lg p-2 h-44 justify-center relative">
                                        <img src={rapidoScr.file_url} className="max-h-full object-contain cursor-pointer" onClick={() => {
                                          setCurrentImageIndex(screenshots.indexOf(rapidoScr));
                                          setGalleryViewMode('single');
                                        }} alt="rapido" />
                                        <span className="absolute bottom-1 bg-black/60 text-[10px] text-white px-2 py-0.5 rounded font-mono">Charge: ₹{d.rapido_charge}</span>
                                      </div>
                                    ) : (
                                      <div className="h-44 border border-dashed rounded-lg bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                                        No screenshot uploaded
                                      </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Scr. Date *</label>
                                        <Input
                                          type="text"
                                          placeholder="DD-MM-YYYY"
                                          value={inputs.rapido_date}
                                          onChange={(e) => updateInput('rapido_date', e.target.value)}
                                          disabled={isRapidoVerified || (handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'DELIVERIES') && user.role === 'ADMIN')}
                                          className="h-8 text-xs font-semibold"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Scr. Time *</label>
                                        <Input
                                          type="text"
                                          placeholder="HH:MM"
                                          value={inputs.rapido_time}
                                          onChange={(e) => updateInput('rapido_time', e.target.value)}
                                          disabled={isRapidoVerified || (handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'DELIVERIES') && user.role === 'ADMIN')}
                                          className="h-8 text-xs font-semibold"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Scr. Amount *</label>
                                        <Input
                                          type="text"
                                          placeholder="Amount ₹"
                                          value={inputs.rapido_amount}
                                          onChange={(e) => updateInput('rapido_amount', e.target.value)}
                                          disabled={isRapidoVerified || (handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'DELIVERIES') && user.role === 'ADMIN')}
                                          className="h-8 text-xs font-semibold font-mono"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Submit delivery verification details */}
                              {!isDeliveryAudited && !handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'DELIVERIES') && (
                                <Button
                                  onClick={async () => {
                                    // 1. Validate Customer Pay
                                    if (isCustomerPaid && !isCustomerPayVerified) {
                                      if (!inputs.payment_date || !inputs.payment_time || !inputs.payment_amount) {
                                        toast.error('Please fill all Customer Payment screenshot fields');
                                        return;
                                      }
                                      if (parseFloat(inputs.payment_amount) !== parseFloat(String(d.received_amount))) {
                                        toast.error('can you check with the photographer about this discrepancy?');
                                        return;
                                      }
                                    }

                                    // 2. Validate Platform Payment
                                    if (isCustomerPaid && is15PercentModel && !isPlatformPayVerified) {
                                      if (!inputs.platform_date || !inputs.platform_time || !inputs.platform_amount) {
                                        toast.error('Please fill all Yourphotocrew Platform Payment screenshot fields');
                                        return;
                                      }
                                      const expectedCut = Math.max(0, Math.round((parseFloat(String(d.received_amount || '0')) - parseFloat(String(d.rapido_charge || '0'))) * 0.15));
                                      if (parseFloat(inputs.platform_amount) !== expectedCut) {
                                        toast.error('have you collected the correct amount from photographer?');
                                        return;
                                      }
                                    }

                                    // 3. Validate Rapido
                                    if (hasRapido && !isRapidoVerified) {
                                      if (!inputs.rapido_date || !inputs.rapido_time || !inputs.rapido_amount) {
                                        toast.error('Please fill all Rapido Ride screenshot fields');
                                        return;
                                      }
                                      if (parseFloat(inputs.rapido_amount) !== parseFloat(String(d.rapido_charge))) {
                                        toast.error('the amount is not matching call photographer');
                                        return;
                                      }
                                    }

                                    // Build update payload
                                    const updateData: Partial<Delivery> = {};
                                    if (isCustomerPaid && !isCustomerPayVerified) {
                                      updateData.payment_screenshot_date = inputs.payment_date;
                                      updateData.payment_screenshot_time = inputs.payment_time;
                                      updateData.payment_screenshot_amount = parseFloat(inputs.payment_amount);
                                    }
                                    if (isCustomerPaid && is15PercentModel && !isPlatformPayVerified) {
                                      updateData.platform_payment_screenshot_date = inputs.platform_date;
                                      updateData.platform_payment_screenshot_time = inputs.platform_time;
                                      updateData.platform_payment_screenshot_amount = parseFloat(inputs.platform_amount);
                                    }
                                    if (hasRapido && !isRapidoVerified) {
                                      updateData.rapido_screenshot_date = inputs.rapido_date;
                                      updateData.rapido_screenshot_time = inputs.rapido_time;
                                      updateData.rapido_screenshot_amount = parseFloat(inputs.rapido_amount);
                                    }

                                    try {
                                      const client = supabase;
                                      const updated = await deliveriesDb.updateDelivery(d.id, updateData, client);
                                      await handleTriggerSheetSync(updated, 'sync', null);
                                      toast.success('Delivery audit submitted and closed!');
                                      loadData();
                                    } catch (err) {
                                      console.error('Failed to submit delivery audit:', err);
                                      toast.error('Failed to save audit details');
                                    }
                                  }}
                                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold text-sm h-10"
                                >
                                  Submit Delivery Audit
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                    </>
                  )}

                  {/* Missed Send Update Task — shown inline if this photographer missed update or had 0 deliveries */}
                  {(() => {
                    const missedEntry = missedSendUpdateData.find(m => m.photographerId === selectedPhotographer);
                    const isAlreadyClosed = missedUpdateClosedPhotographers.has(selectedPhotographer || '');
                    if (!missedEntry || isAlreadyClosed) return null;
                    const enteredVal = enteredCounts[missedEntry.photographerId] ?? '';
                    const enteredNum = parseInt(enteredVal);
                    const countMatches = enteredVal !== '' && enteredNum === missedEntry.totalCount;
                    const isHandedOver = handoverLogs.some(l => l.target_id === selectedPhotographer && l.metadata?.task_type === 'MISSED_UPDATE');
                    const isEditingLocked = isHandedOver && user?.role !== 'SUPER_ADMIN';

                    return (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-rose-500" />
                            Missed Send Update / 0 Deliveries
                          </h3>
                          {user?.role === 'ADMIN' && !isHandedOver && (
                            <Button
                              onClick={() => handleHandoverToSuperAdmin('MISSED_UPDATE')}
                              variant="outline"
                              size="sm"
                              className="border-orange-200 text-orange-600 hover:bg-orange-50 font-semibold text-xs animate-pulse"
                            >
                              Handover to super admin
                            </Button>
                          )}
                        </div>

                        {isHandedOver && (
                          <div className="p-3 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg flex items-center gap-2 font-semibold text-xs animate-fade-in">
                            <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                            <span>This missed send update task has been handed over to Super Admin. Editing is locked.</span>
                          </div>
                        )}

                        <Card className="border-l-4 border-l-rose-500">
                          <CardContent className="py-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="bg-gray-50 rounded p-2">
                                <span className="text-gray-500">Deliveries in sheet:</span>
                                <span className="font-bold ml-1">{missedEntry.totalCount}</span>
                              </div>
                              <div className="bg-gray-50 rounded p-2">
                                <span className="text-gray-500">End-of-day update:</span>
                                <span className={`font-bold ml-1 ${missedEntry.hasSentUpdate ? 'text-green-600' : 'text-red-600'}`}>
                                  {missedEntry.hasSentUpdate ? 'SENT' : 'MISSED'}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-600 block uppercase">
                                Reported Deliveries Count <span className="text-red-500">*</span>
                              </label>
                              <Input
                                type="number"
                                min="0"
                                placeholder={isEditingLocked ? "Handed over to Super Admin" : "Enter count reported by photographer"}
                                value={enteredVal}
                                onChange={(e) => setEnteredCounts({ ...enteredCounts, [missedEntry.photographerId]: e.target.value })}
                                className="h-8 text-xs font-semibold"
                                disabled={isEditingLocked}
                              />
                            </div>
                            <div className="text-[10px] bg-gray-50 p-2 rounded border">
                              <div className="flex justify-between font-medium">
                                <span className="text-gray-500">Verification:</span>
                                <span className={enteredVal === '' ? 'text-gray-500' : countMatches ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                  {enteredVal === '' ? 'Awaiting input...' : countMatches ? '✅ Count Matches' : '❌ Mismatch — add delivery row in Sheet view'}
                                </span>
                              </div>
                            </div>
                            {(!isHandedOver || user?.role === 'SUPER_ADMIN') && (
                              <Button
                                onClick={() => handleCloseMissedSendUpdateTask(missedEntry)}
                                disabled={!countMatches}
                                className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs h-8 font-semibold"
                              >
                                Close Audit Task
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })()}

                  {/* Task 4: Bounty Board Clearance */}
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-purple-600" />
                      Task 4: Bounty Board Clearance
                    </h3>
                    <Card className="border-l-4 border-l-purple-600">
                      <CardContent className="py-5 space-y-3">
                        <p className="text-xs text-gray-600">
                          Verify that there are no unresolved, unclaimed bounty reels pending in the Reel Backlog bounty board. Click the button below to check live.
                        </p>
                        {bountyBoardCount !== null && (
                          bountyBoardVerified ? (
                            <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-300 px-4 py-2 text-xs font-semibold text-green-800">
                              <ShieldCheck className="h-4 w-4 text-green-600" />
                              ✅ Bounty board is clear — no unclaimed pending reels found.
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-300 px-4 py-2 text-xs font-semibold text-red-800">
                              <Clock className="h-4 w-4 text-red-600" />
                              ❌ {bountyBoardCount} unclaimed bounty reel{bountyBoardCount !== 1 ? 's' : ''} still pending. Please resolve before sending update.
                            </div>
                          )
                        )}
                        <Button
                          onClick={handleVerifyBountyBoard}
                          disabled={verifyingBountyBoard || bountyBoardVerified}
                          className="h-9 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs"
                        >
                          {verifyingBountyBoard ? 'Verifying...' : bountyBoardVerified ? '✅ Verified' : 'Verify Bounty Board'}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Send Update for Audit Tasks today */}
                  {user.role === 'ADMIN' && (
                    <div className="pt-2">
                      {adminUpdateSent ? (
                        <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-400 px-4 py-3 text-sm font-semibold text-green-800">
                          <ShieldCheck className="h-5 w-5 text-green-600" />
                          ✅ Audit update already sent for {spreadSheetDate}
                        </div>
                      ) : (
                        <Button
                          onClick={async () => {
                            if (!allPhotographersCleared) {
                              toast.error('Complete or hand over all photographer audit tasks first');
                              return;
                            }
                            if (!bountyBoardVerified) {
                              toast.error('Please verify the Bounty Board clearance first');
                              return;
                            }
                            if (missedSendUpdateData.some(p => !missedUpdateClosedPhotographers.has(p.photographerId))) {
                              toast.error('Close all Missed Send Update audit tasks first');
                              return;
                            }
                            try {
                              await supabase.from('log_events').insert({
                                type: 'ADMIN_DAILY_AUDIT_UPDATE_SENT',
                                user_id: user.id,
                                target_id: user.id,
                                metadata: { date: spreadSheetDate }
                              });
                              setAdminUpdateSent(true);
                              toast.success('Audit update sent for today!');
                            } catch (e) {
                              toast.error('Failed to send update');
                            }
                          }}
                          disabled={!allPhotographersCleared || !bountyBoardVerified || missedSendUpdateData.some(p => !missedUpdateClosedPhotographers.has(p.photographerId))}
                          className={`w-full h-11 font-bold text-sm ${
                            allPhotographersCleared && bountyBoardVerified && !missedSendUpdateData.some(p => !missedUpdateClosedPhotographers.has(p.photographerId))
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Send Update for Audit Tasks today
                        </Button>
                      )}
                    </div>
                  )}

                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-gray-400 text-sm">
                    Select a photographer from the list above to view and complete their audit tasks.
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Live Portrait Bookings */}
          {viewMode === 'portrait' && (
            <LiveBookingsView />
          )}

          {/* Admin Logs Viewer */}
          {viewMode === 'logs' && (
            <AdminLogsViewer />
          )}

          {/* Call Logs View */}
          {viewMode === 'call_logs' && (
            <CallLogsViewer
              spreadSheetDate={spreadSheetDate}
              setSpreadSheetDate={setSpreadSheetDate}
              selectedPhotographer={selectedPhotographer}
              setSelectedPhotographer={setSelectedPhotographer}
              photographers={cityIsolatedPhotographers}
              deliveries={deliveries}
              screenshots={screenshots}
              dealerships={cityIsolatedDealerships}
              allStandupCalls={allStandupCalls}
              setCurrentImageIndex={setCurrentImageIndex}
              setGalleryViewMode={setGalleryViewMode}
            />
          )}



          {/* Audit & Nudge Dialog */}
          <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <BellRing className="h-6 w-6 text-orange-600" />
                  System Audit Results
                </DialogTitle>
                <DialogDescription>
                  Identified breaches as of {new Date().toLocaleDateString('en-IN')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Send Update Section */}
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                  <h4 className="font-semibold text-sm mb-3 flex items-center justify-between text-red-900">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Missing "Send Update" (Today)
                    </span>
                    <Badge variant="destructive">{auditResults?.missingUpdates.length || 0}</Badge>
                  </h4>
                  {auditResults?.missingUpdates.length === 0 ? (
                    <p className="text-xs text-gray-600 italic">No photographers breaching today. Everyone is up to date! 🎉</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {auditResults?.missingUpdates.map(u => (
                        <div key={u.userId} className="p-2 bg-white border border-red-200 rounded-md text-sm flex justify-between items-center shadow-sm">
                          <span className="font-medium text-gray-900">{u.name}</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                            u.leaveType === 'FULL_DAY' 
                              ? 'bg-blue-50 text-blue-600' 
                              : (u.leaveType === 'FIRST_HALF' || u.leaveType === 'SECOND_HALF')
                                ? 'bg-indigo-50 text-indigo-600'
                                : u.deliveryCount === 0 
                                  ? 'bg-amber-50 text-amber-600' 
                                  : 'bg-red-50 text-red-600'
                          }`}>
                            {u.leaveType === 'FULL_DAY' 
                              ? 'On Full Day Leave' 
                              : u.leaveType === 'FIRST_HALF'
                                ? 'On 1st Half Leave'
                                : u.leaveType === 'SECOND_HALF'
                                  ? 'On 2nd Half Leave'
                                  : u.deliveryCount === 0 
                                    ? 'No timings input' 
                                    : `${u.deliveryCount} Pending`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reel Backlog Section */}
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                  <h4 className="font-semibold text-sm mb-3 flex items-center justify-between text-orange-900">
                    <span className="flex items-center gap-2">
                      <Grid className="h-4 w-4" />
                      Reel Backlogs (2+ Days Old)
                    </span>
                    <Badge variant="outline" className="border-orange-300 text-orange-700 bg-white">
                      {auditResults?.reelBacklogs.length || 0}
                    </Badge>
                  </h4>
                  {auditResults?.reelBacklogs.length === 0 ? (
                    <p className="text-xs text-gray-600 italic">No pending reel backlogs found.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {auditResults?.reelBacklogs.map(u => (
                        <div key={u.userId} className="p-2 bg-white border border-orange-200 rounded-md text-sm flex justify-between items-center shadow-sm">
                          <span className="font-medium text-gray-900">{u.name}</span>
                          <span className="text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded text-xs">{u.taskCount} Reels</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4">
                <p className="text-[10px] text-gray-400 max-w-[200px] leading-tight">
                  Nudging sends an instant push notification to the photographer's device.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowAuditDialog(false)}>Dismiss</Button>
                  <Button
                    className="bg-orange-600 hover:bg-orange-700 gap-2 text-white px-6"
                    onClick={handleNudgeAll}
                    disabled={!auditResults || (auditResults.missingUpdates.length === 0 && auditResults.reelBacklogs.length === 0)}
                  >
                    <BellRing className="h-4 w-4" />
                    Nudge All Now
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* V6.0 Conflict Resolution Dialog */}
          <Dialog open={isConflictDialogOpen} onOpenChange={setIsConflictDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Sync Conflict Detected
                </DialogTitle>
                <DialogDescription>
                  The data in Google Sheets for <strong>{conflictDelivery?.delivery_name}</strong> is newer than your current CRM record. 
                  This usually happens when someone edits the spreadsheet directly.
                </DialogDescription>
              </DialogHeader>

              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-sm space-y-3">
                <div className="flex items-start gap-2">
                  <div className="mt-1 font-bold text-amber-900">1. Force Overwrite:</div>
                  <div className="text-amber-800">Use your CRM data to overwrite the Google Sheet. Use this if you are sure your CRM data is correct.</div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-1 font-bold text-amber-900">2. Refresh from Sheet:</div>
                  <div className="text-amber-800">Pull data from Google Sheets into the CRM. Use this to pick up changes made in the spreadsheet.</div>
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setIsConflictDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="secondary" 
                  className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" 
                  onClick={handleRefreshFromSheet}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Refreshing...' : 'Refresh CRM'}
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1" 
                  onClick={handleForceOverwrite}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Forcing...' : 'Force Overwrite'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
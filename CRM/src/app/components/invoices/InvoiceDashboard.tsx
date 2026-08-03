import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../../context/ConfigContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  FileText,
  Plus,
  ArrowLeft,
  Search,
  Filter,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  FileCode,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceGenerator } from './InvoiceGenerator';
import { InvoicePreview } from './InvoicePreview';

interface Invoice {
  id: string;
  dealership_id: string;
  invoice_number: string;
  invoice_date: string;
  billing_month: string;
  total_amount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'VOID';
  created_at: string;
}

export function InvoiceDashboard() {
  const navigate = useNavigate();
  const { dealerships } = useConfig();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dealerFilter, setDealerFilter] = useState<string>('ALL');

  // Generator & Preview states
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('invoice_date', { ascending: false });

      if (error) {
        // If table doesn't exist yet, we default to empty array
        if (error.code === 'PGRST116' || error.message.includes('relation "public.invoices" does not exist')) {
          setInvoices([]);
          return;
        }
        throw error;
      }
      setInvoices(data || []);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      toast.error('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleUpdateStatus = async (invoiceId: string, newStatus: 'DRAFT' | 'SENT' | 'PAID' | 'VOID') => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', invoiceId);

      if (error) throw error;
      toast.success(`Invoice status updated to ${newStatus}`);
      fetchInvoices();
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        setSelectedInvoice(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status.');
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    const confirm = window.confirm(`Are you sure you want to delete invoice ${invoice.invoice_number}? This cannot be undone.`);
    if (!confirm) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id);

      if (error) throw error;
      toast.success('Invoice deleted successfully');
      fetchInvoices();
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      toast.error('Failed to delete invoice. It may be referenced elsewhere.');
    }
  };

  // Helper mapping functions
  const getDealerName = (id: string) => {
    const d = dealerships.find(deal => deal.id === id);
    return d ? d.name : 'Unknown Dealership';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Paid</Badge>;
      case 'SENT':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Sent</Badge>;
      case 'DRAFT':
        return <Badge className="bg-zinc-100 text-zinc-800 border-zinc-200">Draft</Badge>;
      case 'VOID':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Void</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatMonth = (monthStr: string) => {
    if (!monthStr || !monthStr.includes('-')) return monthStr;
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const filteredInvoices = invoices.filter(invoice => {
    const dealerName = getDealerName(invoice.dealership_id).toLowerCase();
    const invNum = invoice.invoice_number.toLowerCase();
    const month = formatMonth(invoice.billing_month).toLowerCase();
    
    const matchesSearch = dealerName.includes(searchTerm.toLowerCase()) || 
                          invNum.includes(searchTerm.toLowerCase()) ||
                          month.includes(searchTerm.toLowerCase());
                          
    const matchesStatus = statusFilter === 'ALL' || invoice.status === statusFilter;
    const matchesDealer = dealerFilter === 'ALL' || invoice.dealership_id === dealerFilter;

    return matchesSearch && matchesStatus && matchesDealer;
  });

  return (
    <div className="min-h-screen bg-zinc-50/50 p-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/config')}
            className="rounded-full hover:bg-zinc-200/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Invoices</h1>
            <p className="text-sm text-zinc-500">Manage monthly billing and invoices for dealerships</p>
          </div>
        </div>

        <Button onClick={() => setShowGenerator(true)} className="btn-gradient bg-blue-600 text-white font-semibold">
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-sm border-zinc-200/60 bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Generated</p>
                <h3 className="text-3xl font-bold mt-1 text-zinc-900">
                  ₹{invoices.filter(i => i.status !== 'VOID').reduce((acc, i) => acc + Number(i.total_amount), 0).toLocaleString('en-IN')}
                </h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <FileText className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-zinc-200/60 bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Received (Paid)</p>
                <h3 className="text-3xl font-bold mt-1 text-emerald-700">
                  ₹{invoices.filter(i => i.status === 'PAID').reduce((acc, i) => acc + Number(i.total_amount), 0).toLocaleString('en-IN')}
                </h3>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-zinc-200/60 bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Outstanding (Sent / Draft)</p>
                <h3 className="text-3xl font-bold mt-1 text-amber-700">
                  ₹{invoices.filter(i => i.status === 'SENT' || i.status === 'DRAFT').reduce((acc, i) => acc + Number(i.total_amount), 0).toLocaleString('en-IN')}
                </h3>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="shadow-sm border-zinc-200/60 bg-white mb-6">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search invoice number, showroom..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 bg-zinc-50 border-zinc-200 focus:bg-white text-sm"
              />
            </div>

            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-zinc-50 border-zinc-200 text-sm">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="VOID">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={dealerFilter} onValueChange={setDealerFilter}>
                <SelectTrigger className="bg-zinc-50 border-zinc-200 text-sm">
                  <SelectValue placeholder="Filter by Dealership" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Dealerships</SelectItem>
                  {dealerships.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setDealerFilter('ALL'); }} className="text-zinc-500 border-zinc-200 hover:text-zinc-800 text-sm ml-auto">
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="shadow-sm border-zinc-200/60 bg-white overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-zinc-500 font-medium">Loading invoices list...</p>
              </div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 text-sm">
              <FileText className="h-10 w-10 mx-auto text-zinc-300 mb-3" />
              No invoices found. Click "Create Invoice" to generate your first invoice.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-zinc-50 border-b border-zinc-200">
                <TableRow>
                  <TableHead className="font-semibold text-zinc-600 text-xs">Invoice Number</TableHead>
                  <TableHead className="font-semibold text-zinc-600 text-xs">Dealership</TableHead>
                  <TableHead className="font-semibold text-zinc-600 text-xs">Billing Period</TableHead>
                  <TableHead className="font-semibold text-zinc-600 text-xs">Invoice Date</TableHead>
                  <TableHead className="font-semibold text-zinc-600 text-xs text-right">Amount (₹)</TableHead>
                  <TableHead className="font-semibold text-zinc-600 text-xs text-center">Status</TableHead>
                  <TableHead className="font-semibold text-zinc-600 text-xs text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map(invoice => (
                  <TableRow key={invoice.id} className="hover:bg-zinc-50/50 transition-colors">
                    <TableCell className="font-medium text-sm text-zinc-900">{invoice.invoice_number}</TableCell>
                    <TableCell className="text-sm text-zinc-700">{getDealerName(invoice.dealership_id)}</TableCell>
                    <TableCell className="text-sm text-zinc-600">{formatMonth(invoice.billing_month)}</TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {new Date(invoice.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-900 font-bold text-right">
                      ₹{Number(invoice.total_amount).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right pr-6 space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedInvoice(invoice)}
                        className="text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                        title="View / Print PDF"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteInvoice(invoice)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Delete Invoice"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generator Modal */}
      {showGenerator && (
        <InvoiceGenerator
          onClose={() => {
            setShowGenerator(false);
            fetchInvoices();
          }}
        />
      )}

      {/* Preview Modal */}
      {selectedInvoice && (
        <InvoicePreview
          invoiceId={selectedInvoice.id}
          dealershipId={selectedInvoice.dealership_id}
          invoiceNumber={selectedInvoice.invoice_number}
          invoiceDate={selectedInvoice.invoice_date}
          billingMonth={selectedInvoice.billing_month}
          status={selectedInvoice.status}
          onUpdateStatus={(status) => handleUpdateStatus(selectedInvoice.id, status)}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}

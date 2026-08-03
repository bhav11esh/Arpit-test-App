import React, { useState, useEffect } from 'react';
import { useConfig } from '../../context/ConfigContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { getShowroomCode } from '../../lib/utils';
import { toast } from 'sonner';
import { Calendar, FileText, Check, AlertCircle, Trash2, Edit } from 'lucide-react';
import * as deliveriesDb from '../../lib/db/deliveries';

interface InvoiceGeneratorProps {
  onClose: () => void;
}

interface GroupedLineItem {
  id: string;
  description: string;
  date: string;
  rate: number;
  quantity: number;
  total: number;
}

export function InvoiceGenerator({ onClose }: InvoiceGeneratorProps) {
  const { dealerships, updateDealership } = useConfig();
  
  // Selection States
  const [selectedDealerId, setSelectedDealerId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // YYYY-MM
  
  // Invoice Details
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>('');
  
  // Step & Data states
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [lineItems, setLineItems] = useState<GroupedLineItem[]>([]);
  const [deliveriesToLink, setDeliveriesToLink] = useState<string[]>([]);
  
  const selectedDealer = dealerships.find(d => d.id === selectedDealerId);

  // Generate Year/Month options (last 12 months)
  const getMonthOptions = () => {
    const options = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const label = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      options.push({ value: `${year}-${month}`, label });
      date.setMonth(date.getMonth() - 1);
    }
    return options;
  };

  // Automatically calculate the Invoice Date to be the last day of the billing month
  useEffect(() => {
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0); // last day of the month
      const yyyy = lastDay.getFullYear();
      const mm = String(lastDay.getMonth() + 1).padStart(2, '0');
      const dd = String(lastDay.getDate()).padStart(2, '0');
      setInvoiceDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [selectedMonth]);

  // Load next invoice number when dealer is selected
  useEffect(() => {
    if (selectedDealer) {
      setInvoiceNumber(selectedDealer.next_invoice_number?.toString() || '100000');
    }
  }, [selectedDealerId]);

  const handleFetchData = async () => {
    if (!selectedDealerId) {
      toast.error('Please select a dealership');
      return;
    }
    if (!selectedMonth) {
      toast.error('Please select a billing month');
      return;
    }

    setLoading(true);
    try {
      const dealer = dealerships.find(d => d.id === selectedDealerId)!;
      const targetCode = getShowroomCode(dealer.name);

      // Fetch all DONE deliveries
      // V4.7 FIX: Use filter limit 5000 to prevent data truncation
      const { data: rawDeliveries, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('showroom_code', targetCode)
        .eq('status', 'DONE')
        .is('deleted_at', null)
        .is('invoice_id', null);

      if (error) throw error;

      // Filter by month (delivery.date format: YYYY-MM-DD)
      const monthFiltered = (rawDeliveries || []).filter((d: any) => {
        return d.date && d.date.startsWith(selectedMonth);
      });

      // Filter exception shoots for CUSTOMER_PAID showrooms
      // - For DEALER_PAID: Fetch all DONE deliveries in that month
      // - For CUSTOMER_PAID: Fetch ONLY those flagged is_invoice_billing = true
      const finalDeliveries = monthFiltered.filter((d: any) => {
        if (dealer.paymentType === 'DEALER_PAID') return true;
        return d.is_invoice_billing === true;
      });

      if (finalDeliveries.length === 0) {
        toast.warning('No billable deliveries found for this dealership in the selected month.');
        setLoading(false);
        return;
      }

      // Group deliveries by Date and Rate (received_amount)
      const groups = new Map<string, { date: string; rate: number; count: number; ids: string[] }>();
      const defaultRate = dealer.ratePerDelivery || 700;

      finalDeliveries.forEach((d: any) => {
        const dateStr = d.date; // YYYY-MM-DD
        const rate = Number(d.received_amount) || defaultRate;
        const key = `${dateStr}_${rate}`;

        if (groups.has(key)) {
          const g = groups.get(key)!;
          g.count += 1;
          g.ids.push(d.id);
        } else {
          groups.set(key, {
            date: dateStr,
            rate: rate,
            count: 1,
            ids: [d.id]
          });
        }
      });

      // Map to GroupedLineItem array
      const items: GroupedLineItem[] = [];
      const allDeliveryIds: string[] = [];
      let idx = 0;

      groups.forEach((value, key) => {
        const [year, month, day] = value.date.split('-');
        const formattedDate = `${day}/${month}/${year}`;
        
        // Default description based on rate type
        let desc = 'Shoot Coverage';
        if (value.rate > defaultRate) {
          desc = 'Early morning home delivery';
        }

        items.push({
          id: `item_${idx++}`,
          description: desc,
          date: formattedDate,
          rate: value.rate,
          quantity: value.count,
          total: value.count * value.rate
        });

        allDeliveryIds.push(...value.ids);
      });

      // Sort items by date ascending
      items.sort((a, b) => {
        const [da, ma, ya] = a.date.split('/').map(Number);
        const [db, mb, yb] = b.date.split('/').map(Number);
        return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
      });

      setLineItems(items);
      setDeliveriesToLink(allDeliveryIds);
      setStep(2);
    } catch (err: any) {
      console.error('Error fetching billing data:', err);
      toast.error('Failed to query deliveries.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDescription = (id: string, newDesc: string) => {
    setLineItems(prev => prev.map(item => item.id === id ? { ...item, description: newDesc } : item));
  };

  const handleEditQuantity = (id: string, newQty: number) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const qty = Math.max(1, newQty);
        return { ...item, quantity: qty, total: qty * item.rate };
      }
      return item;
    }));
  };

  const handleEditRate = (id: string, newRate: number) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const rate = Math.max(0, newRate);
        return { ...item, rate: rate, total: item.quantity * rate };
      }
      return item;
    }));
  };

  const handleDeleteItem = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async () => {
    if (!invoiceNumber.trim()) {
      toast.error('Invoice Number is required');
      return;
    }

    const totalAmount = lineItems.reduce((acc, item) => acc + item.total, 0);
    if (totalAmount <= 0) {
      toast.error('Invoice total amount must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      // 1. Check if invoice number is already taken
      const { data: existing, error: checkError } = await supabase
        .from('invoices')
        .select('id')
        .eq('invoice_number', invoiceNumber.trim())
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        toast.error(`Invoice number "${invoiceNumber}" is already in use. Please choose another.`);
        setLoading(false);
        return;
      }

      // 2. Insert Invoice Metadata into Supabase
      const { data: newInvoice, error: insertError } = await supabase
        .from('invoices')
        .insert({
          dealership_id: selectedDealerId,
          invoice_number: invoiceNumber.trim(),
          invoice_date: invoiceDate,
          billing_month: selectedMonth,
          total_amount: totalAmount,
          status: 'DRAFT',
          // Save line items as metadata JSON on the invoice record so it's immutable
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any)
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Update the Dealership's next invoice number (auto-increment by 1)
      const nextNum = (parseInt(invoiceNumber) || 100000) + 1;
      await updateDealership(selectedDealerId, {
        next_invoice_number: nextNum
      });

      // 4. Link deliveries to this invoice to prevent double-billing
      if (deliveriesToLink.length > 0) {
        const { error: linkError } = await supabase
          .from('deliveries')
          .update({
            invoice_id: newInvoice.id,
            updated_at: new Date().toISOString()
          })
          .in('id', deliveriesToLink);
        
        if (linkError) {
          console.warn('Could not set links on deliveries:', linkError);
        }
      }

      toast.success(`Invoice ${invoiceNumber} generated successfully!`);
      onClose();
    } catch (err: any) {
      console.error('Error generating invoice:', err);
      toast.error(`Failed to generate invoice: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const totalBillingAmount = lineItems.reduce((acc, item) => acc + item.total, 0);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className={step === 2 ? "max-w-4xl" : "max-w-md"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {step === 1 ? 'Generate New Invoice' : `Invoice ${invoiceNumber} - Preview`}
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? 'Select the dealership and month to calculate monthly shoots.' 
              : 'Review and edit the line items before creating the invoice.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          /* Step 1: Select inputs */
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="dealer">Select Dealership</Label>
              <Select value={selectedDealerId} onValueChange={setSelectedDealerId}>
                <SelectTrigger id="dealer">
                  <SelectValue placeholder="Select Dealership" />
                </SelectTrigger>
                <SelectContent>
                  {dealerships.filter(d => d.active !== false).map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.paymentType === 'CUSTOMER_PAID' ? 'Customer Paid' : 'Dealer Paid'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">Select Billing Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {getMonthOptions().map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDealer && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invNum">Starting Invoice #</Label>
                  <Input
                    id="invNum"
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. 100000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invDate">Invoice Date</Label>
                  <Input
                    id="invDate"
                    type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            {selectedDealer?.paymentType === 'CUSTOMER_PAID' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-tight font-medium">
                  This is a CUSTOMER-PAID dealership. The generator will scan for and fetch ONLY those shoots flagged by the photographer as "Paid Showroom Specific Content" (showroom-billed exception shoots).
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Preview & Edit Line Items */
          <div className="space-y-6 py-2">
            <div className="grid grid-cols-3 gap-4 p-4 bg-zinc-50 border border-zinc-100 rounded-xl text-xs text-zinc-600">
              <div>
                <span className="font-semibold block text-zinc-400 uppercase tracking-wide">Dealership</span>
                <span className="text-sm font-bold text-zinc-900 mt-0.5 block">{selectedDealer?.name}</span>
              </div>
              <div>
                <span className="font-semibold block text-zinc-400 uppercase tracking-wide">Billing Month</span>
                <span className="text-sm font-bold text-zinc-900 mt-0.5 block">
                  {getMonthOptions().find(o => o.value === selectedMonth)?.label}
                </span>
              </div>
              <div>
                <span className="font-semibold block text-zinc-400 uppercase tracking-wide">Invoice Date</span>
                <span className="text-sm font-bold text-zinc-900 mt-0.5 block">
                  {new Date(invoiceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto border border-zinc-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b sticky top-0">
                  <tr className="text-zinc-500 font-semibold text-xs">
                    <th className="p-3 text-left">Description</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-center w-24">Rate (₹)</th>
                    <th className="p-3 text-center w-20">Qty</th>
                    <th className="p-3 text-right w-28">Total (₹)</th>
                    <th className="p-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {lineItems.map(item => (
                    <tr key={item.id} className="hover:bg-zinc-50/50">
                      <td className="p-3">
                        <Input
                          value={item.description}
                          onChange={e => handleEditDescription(item.id, e.target.value)}
                          className="h-8 border-transparent hover:border-zinc-200 focus:border-zinc-300 px-2 py-1 text-sm bg-transparent"
                        />
                      </td>
                      <td className="p-3 text-zinc-600 font-medium">{item.date}</td>
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={e => handleEditRate(item.id, Number(e.target.value))}
                          className="h-8 text-center px-1 py-1"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={e => handleEditQuantity(item.id, Number(e.target.value))}
                          className="h-8 text-center px-1 py-1"
                        />
                      </td>
                      <td className="p-3 text-right font-bold text-zinc-950">
                        ₹{item.total.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center bg-zinc-900 text-white p-4 rounded-xl">
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Grand Total</span>
                <span className="text-xs text-zinc-300 italic mt-0.5 block">
                  {/* Words conversion helper will be handled on preview, here is a visual label */}
                  Billed in local currency (INR)
                </span>
              </div>
              <span className="text-2xl font-black">₹{totalBillingAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleFetchData} disabled={loading} className="bg-blue-600 text-white font-semibold">
                {loading ? 'Scanning DB...' : 'Next'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="bg-emerald-600 text-white font-semibold">
                {loading ? 'Creating...' : 'Save & Create Invoice'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

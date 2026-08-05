import React, { useRef, useState, useEffect } from 'react';
import { useConfig } from '../../context/ConfigContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
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
import { Printer, Download, ArrowLeft, X, Mail, Phone, MapPin, Building, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { getShowroomCode } from '../../lib/utils';

interface InvoicePreviewProps {
  invoiceId: string;
  dealershipId: string;
  invoiceNumber: string;
  invoiceDate: string;
  billingMonth: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'VOID';
  onUpdateStatus: (status: 'DRAFT' | 'SENT' | 'PAID' | 'VOID') => void;
  onClose: () => void;
}

interface InvoiceLineItem {
  description: string;
  date: string;
  rate: number;
  quantity: number;
  total: number;
}

// Helper to convert number to Indian Currency Words
const numberToWords = (num: number): string => {
  const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  if (num === 0) return 'INR ZERO ONLY';

  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  
  // Crore
  str += parseInt(n[1]) !== 0 ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'crore ' : '';
  // Lakh
  str += parseInt(n[2]) !== 0 ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'lakh ' : '';
  // Thousand
  str += parseInt(n[3]) !== 0 ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'thousand ' : '';
  // Hundred
  str += parseInt(n[4]) !== 0 ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'hundred ' : '';
  // Tens / Ones
  str += parseInt(n[5]) !== 0 ? (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';

  return `INR ${str.trim().toUpperCase()} ONLY`;
};

export function InvoicePreview({
  invoiceId,
  dealershipId,
  invoiceNumber,
  invoiceDate,
  billingMonth,
  status,
  onUpdateStatus,
  onClose,
}: InvoicePreviewProps) {
  const { dealerships } = useConfig();
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const dealer = dealerships.find(d => d.id === dealershipId);

  useEffect(() => {
    const fetchInvoiceItems = async () => {
      setLoading(true);
      try {
        if (!dealer) return;
        const targetCode = getShowroomCode(dealer.name);

        // Fetch deliveries linked to this specific invoice
        // V4.7 FIX: Use filter limit 5000 to prevent data truncation
        const { data: finalDeliveries, error } = await supabase
          .from('deliveries')
          .select('*')
          .eq('invoice_id', invoiceId)
          .is('deleted_at', null);

        if (error) throw error;

        const groups = new Map<string, { date: string; rate: number; count: number }>();
        const defaultRate = dealer.ratePerDelivery || 700;

        finalDeliveries.forEach((d: any) => {
          const dateStr = d.date;
          const rate = Number(d.received_amount) || defaultRate;
          const key = `${dateStr}_${rate}`;

          if (groups.has(key)) {
            const g = groups.get(key)!;
            g.count += 1;
          } else {
            groups.set(key, {
              date: dateStr,
              rate: rate,
              count: 1
            });
          }
        });

        const items: InvoiceLineItem[] = [];
        groups.forEach((value) => {
          const [year, month, day] = value.date.split('-');
          const formattedDate = `${day}/${month}/${year}`;
          
          let desc = 'Shoot Coverage';
          if (value.rate > defaultRate) {
            desc = 'Early morning home delivery';
          }

          items.push({
            description: desc,
            date: formattedDate,
            rate: value.rate,
            quantity: value.count,
            total: value.count * value.rate
          });
        });

        items.sort((a, b) => {
          const [da, ma, ya] = a.date.split('/').map(Number);
          const [db, mb, yb] = b.date.split('/').map(Number);
          return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
        });

        setLineItems(items);
      } catch (err) {
        console.error('Error loading line items:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceItems();
  }, [dealershipId, billingMonth]);

  const handlePrint = () => {
    const printArea = printAreaRef.current;
    if (!printArea) return;

    // Clone the invoice HTML content
    const clonedContent = printArea.cloneNode(true) as HTMLElement;

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) return;

    // Write clean print HTML into iframe
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
          <style>
            @page { margin: 10mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              background: white;
              font-family: Inter, sans-serif;
              font-size: 12px;
              color: #18181b;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            /* ── Logo: constrain to header-size ── */
            img[alt="yourphotocrew logo"] {
              height: 64px !important;
              width: auto !important;
              max-width: 180px !important;
              display: block;
              margin-bottom: 12px;
            }
            img { max-width: 100%; height: auto; }

            /* ── Outer container ── */
            #invoice-print-root > div {
              display: flex;
              flex-direction: column;
              min-height: 277mm;
              justify-content: space-between;
              padding: 10mm;
              background: white;
            }

            /* ── Tailwind utility replacements ── */
            .flex { display: flex !important; }
            .flex-col { flex-direction: column !important; }
            .items-start { align-items: flex-start !important; }
            .items-center { align-items: center !important; }
            .justify-between { justify-content: space-between !important; }
            .text-right { text-align: right !important; }
            .text-left { text-align: left !important; }
            .text-center { text-align: center !important; }
            .font-bold { font-weight: 700 !important; }
            .font-extrabold { font-weight: 800 !important; }
            .font-semibold { font-weight: 600 !important; }
            .font-medium { font-weight: 500 !important; }
            .uppercase { text-transform: uppercase !important; }
            .tracking-widest { letter-spacing: 0.1em !important; }
            .tracking-wider { letter-spacing: 0.05em !important; }
            .tracking-tight { letter-spacing: -0.025em !important; }

            /* ── Grid ── */
            .grid { display: grid !important; }
            .grid-cols-2 { grid-template-columns: 1fr 1fr !important; }
            .gap-6 { gap: 24px !important; }

            /* ── Borders ── */
            .border-b { border-bottom: 1px solid #e4e4e7 !important; }
            .border-b-2 { border-bottom: 2px solid #e4e4e7 !important; }
            .border-l { border-left: 1px solid #e4e4e7 !important; }
            .border { border: 1px solid #e4e4e7 !important; }

            /* ── Spacing ── */
            .pb-5 { padding-bottom: 20px !important; }
            .mb-5 { margin-bottom: 20px !important; }
            .mb-6 { margin-bottom: 24px !important; }
            .mb-4 { margin-bottom: 16px !important; }
            .mt-0\\.5 { margin-top: 2px !important; }
            .mt-3 { margin-top: 12px !important; }
            .mt-2 { margin-top: 8px !important; }
            .p-4 { padding: 16px !important; }
            .p-3 { padding: 12px !important; }
            .pl-6 { padding-left: 24px !important; }
            .px-3 { padding-left: 12px; padding-right: 12px !important; }
            .py-1 { padding-top: 4px; padding-bottom: 4px !important; }
            .space-y-1 > * + * { margin-top: 4px !important; }
            .space-y-2 > * + * { margin-top: 8px !important; }

            /* ── Text sizes ── */
            .text-xl { font-size: 18px !important; }
            .text-sm { font-size: 13px !important; }
            .text-xs { font-size: 11px !important; }
            .text-\\[10px\\] { font-size: 10px !important; }
            .text-base { font-size: 14px !important; }

            /* ── Colors ── */
            .text-zinc-950 { color: #09090b !important; }
            .text-zinc-900 { color: #18181b !important; }
            .text-zinc-800 { color: #27272a !important; }
            .text-zinc-700 { color: #3f3f46 !important; }
            .text-zinc-600 { color: #52525b !important; }
            .text-zinc-500 { color: #71717a !important; }
            .text-zinc-400 { color: #a1a1aa !important; }
            .text-white { color: #fff !important; }
            .bg-zinc-900 { background-color: #18181b !important; }
            .bg-zinc-50 { background-color: #fafafa !important; }
            .bg-zinc-50\\/70 { background-color: rgba(250,250,250,0.7) !important; }
            .bg-zinc-50\\/20 { background-color: rgba(250,250,250,0.2) !important; }
            .bg-white { background: white !important; }
            .text-amber-600 { color: #d97706 !important; }
            .border-zinc-100 { border-color: #f4f4f5 !important; }
            .border-zinc-200 { border-color: #e4e4e7 !important; }
            .border-zinc-200\\/60 { border-color: rgba(228,228,231,0.6) !important; }

            /* ── Misc ── */
            .rounded-md { border-radius: 6px !important; }
            .rounded-xl { border-radius: 12px !important; }
            .inline-block { display: inline-block !important; }
            .block { display: block !important; }
            .w-full { width: 100% !important; }
            .whitespace-pre-line { white-space: pre-line !important; }
            .leading-relaxed { line-height: 1.625 !important; }
            .divide-y > * + * { border-top: 1px solid #f4f4f5 !important; }

            /* ── Table ── */
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px 12px; }
            .w-12 { width: 48px; }
            .w-20 { width: 80px; }
            .w-24 { width: 96px; }
            .w-28 { width: 112px; }

            /* ── Icon sizing (lucide SVGs) ── */
            .h-3\\.5 { height: 14px !important; width: 14px !important; }
            svg { display: inline-block; vertical-align: middle; }

            /* ── Flex row for icon + text ── */
            p.flex { display: flex !important; align-items: center !important; gap: 6px !important; }

            /* ── Hide shadow/decoration ── */
            .shadow-md, .shadow-sm { box-shadow: none !important; }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          <div id="invoice-print-root"></div>
        </body>
      </html>
    `);

    iframeDoc.close();

    // Insert cloned content
    const root = iframeDoc.getElementById('invoice-print-root');
    if (root) {
      root.appendChild(clonedContent);
    }

    // Print after fonts load
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Cleanup iframe after print dialog closes
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };


  const totalAmount = lineItems.reduce((acc, item) => acc + item.total, 0);

  // Formatted Billing Period
  const getBillingPeriodLabel = () => {
    if (!billingMonth) return '';
    const [year, month] = billingMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const formattedInvoiceDate = invoiceDate
    ? new Date(invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
    : '';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden bg-zinc-100">
        
        {/* Style block for Print override (Inject print media queries) */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              margin: 0;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              min-height: auto !important;
              overflow: visible !important;
              position: static !important;
              background: white !important;
              -webkit-print-color-adjust: exact;
            }
            /* Hide the main page flow elements to take up exactly 0 space during printing */
            #root,
            #__next,
            header,
            footer,
            main,
            .no-print {
              display: none !important;
            }
            /* Hide Radix backdrop overlay specifically */
            div[data-radix-portal] > [data-state="open"]:not([role="dialog"]):not(:has([role="dialog"])) {
              display: none !important;
            }
            /* Reset Radix portal wrapper and dialog content layouts to static blocks to prevent centering transforms/clipping */
            div[data-radix-portal],
            div[data-radix-portal] :has([role="dialog"]),
            div[role="dialog"],
            .max-w-5xl,
            .overflow-y-auto,
            .flex-1,
            .invoice-wrap-print {
              position: static !important;
              display: block !important;
              transform: none !important;
              left: auto !important;
              top: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              overflow: visible !important;
              box-shadow: none !important;
              border: none !important;
              background: white !important;
            }
             #printable-invoice-container {
              display: block !important;
              position: static !important;
              left: auto !important;
              top: auto !important;
              width: 100% !important;
              height: auto !important;
              background: white !important;
              padding: 15mm !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              box-sizing: border-box !important;
            }
            .invoice-wrap-print {
              display: block !important;
              position: static !important;
              width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}} />

        <DialogHeader className="p-4 bg-white border-b flex flex-row items-center justify-between no-print">
          <div>
            <DialogTitle>Invoice Detail View</DialogTitle>
          </div>
          <div className="flex items-center gap-3 pr-8">
            <span className="text-xs text-zinc-500 font-semibold">Update Status:</span>
            <Select value={status} onValueChange={(val: any) => onUpdateStatus(val)}>
              <SelectTrigger className="w-28 h-8 text-xs bg-zinc-50 border-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="VOID">Void</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handlePrint} variant="outline" size="sm" className="h-8 border-zinc-200 hover:bg-zinc-50 text-xs">
              <Printer className="h-3.5 w-3.5 mr-1" />
              Print / Save PDF
            </Button>
            <Button onClick={onClose} variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-zinc-100">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Invoice Page Container (scrollable inside app modal) */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-100/50">
          <div className="flex justify-center w-full min-h-full pb-8 invoice-wrap-print">
            {/* A4 Sheet Mockup */}
            <div
              id="printable-invoice-container"
              ref={printAreaRef}
              className="w-[210mm] min-h-[297mm] bg-white p-10 shadow-md border border-zinc-200/60 rounded-xl relative flex flex-col justify-between"
              style={{ boxSizing: 'border-box' }}
            >
            
            <div>
              {/* Sender Details Header */}
              <div className="flex justify-between items-start border-b border-zinc-100 pb-5 mb-5">
                <div>
                  <img
                    src="/yourphotocrew_logo.png"
                    alt="yourphotocrew logo"
                    className="h-16 w-auto object-contain mb-4"
                    onError={(e) => {
                      // Fallback text if logo fails to load (ensures clean styling)
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <h1 className="text-xl font-bold tracking-tight text-zinc-950 uppercase">yourphotocrew</h1>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mt-0.5">Sole Proprietorship</span>
                  <div className="text-xs text-zinc-600 mt-3 space-y-1">
                    <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-zinc-400" /> 3rd Floor, 90-B, 4th Cross Road, 7th block Koramangala, Bengaluru</p>
                    <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-zinc-400" /> arpitmudgal24@gmail.com</p>
                    <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-zinc-400" /> +91-9608310344</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-zinc-900 text-white font-extrabold uppercase tracking-widest text-[10px] rounded-md mb-6">
                    INVOICE
                  </div>
                  <div className="space-y-2 text-xs text-zinc-700">
                    <p><span className="text-zinc-400 uppercase font-bold tracking-wider text-[10px]">Invoice Number:</span> <span className="font-extrabold text-zinc-900">{invoiceNumber}</span></p>
                    <p><span className="text-zinc-400 uppercase font-bold tracking-wider text-[10px]">Invoice Date:</span> <span className="font-extrabold text-zinc-900">{formattedInvoiceDate}</span></p>
                    <p><span className="text-zinc-400 uppercase font-bold tracking-wider text-[10px]">Billing Period:</span> <span className="font-semibold text-zinc-800">{getBillingPeriodLabel()}</span></p>
                  </div>
                </div>
              </div>

              {/* Billed To Details */}
              <div className="grid grid-cols-2 gap-6 bg-zinc-50/70 p-4 rounded-xl border border-zinc-100 mb-5">
                <div>
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Billed To</h3>
                  <div className="space-y-1 text-xs text-zinc-800">
                    <p className="font-extrabold text-zinc-950 text-sm">{dealer?.billing_company_name || dealer?.name}</p>
                    <p className="text-zinc-600 leading-relaxed whitespace-pre-line">{dealer?.billing_address || 'No billing address configured'}</p>
                    <p><span className="text-zinc-400 font-medium">State Name:</span> {dealer?.billing_state || 'Karnataka'}</p>
                  </div>
                </div>
                
                <div className="border-l border-zinc-200/60 pl-6">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Contact Details</h3>
                  <div className="space-y-1 text-xs text-zinc-700 mt-2">
                    {dealer?.billing_email && <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-zinc-400" /> {dealer.billing_email}</p>}
                    {dealer?.billing_phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-zinc-400" /> {dealer.billing_phone}</p>}
                  </div>
                </div>
              </div>

              {/* Table Loader */}
              {loading ? (
                <div className="text-center py-12 text-xs text-zinc-500 font-semibold">
                  Calculating monthly shoot items...
                </div>
              ) : (
                /* Item Table */
                <table className="w-full text-xs mb-5">
                  <thead>
                    <tr className="border-b-2 border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px] bg-zinc-50/20">
                      <th className="p-3 text-left w-12">#</th>
                      <th className="p-3 text-left">Description</th>
                      <th className="p-3 text-center w-28">Service Date</th>
                      <th className="p-3 text-right w-24">Rate (₹)</th>
                      <th className="p-3 text-center w-20">Quantity</th>
                      <th className="p-3 text-right w-28">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-800">
                    {lineItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/20">
                        <td className="p-3 font-semibold text-zinc-400">{idx + 1}</td>
                        <td className="p-3 font-semibold text-zinc-900">{item.description}</td>
                        <td className="p-3 text-center text-zinc-600 font-medium">{item.date}</td>
                        <td className="p-3 text-right text-zinc-700">₹{item.rate.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-center text-zinc-700 font-bold">{item.quantity}</td>
                        <td className="p-3 text-right font-bold text-zinc-950">₹{item.total.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="border-t-2 border-zinc-200 font-black text-sm text-zinc-950 bg-zinc-50/30">
                      <td colSpan={4} className="p-4 text-left uppercase tracking-wider text-[10px] text-zinc-500">Total Billing Amount</td>
                      <td className="p-4 text-center">
                        {lineItems.reduce((acc, i) => acc + i.quantity, 0)}
                      </td>
                      <td className="p-4 text-right text-base text-zinc-950">
                        ₹{totalAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* Service & Text Amount Section */}
              <div className="space-y-2 border-t border-b border-zinc-100 py-3 mb-5 text-xs">
                <p><span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">List of services’s done:</span> <span className="font-extrabold text-zinc-850">Photos + Videos + Reel</span></p>
                <p><span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Total Billing Chargeable Invoice Amount:</span> <span className="font-black text-zinc-950">₹{totalAmount.toLocaleString('en-IN')}</span></p>
                <p><span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Total Billing Chargeable Invoice Amount (In Words):</span> <span className="font-bold text-zinc-900">{numberToWords(totalAmount)}</span></p>
              </div>
            </div>

            {/* Bank details & signature footer */}
            <div className="flex justify-between items-end pt-6 border-t border-zinc-100 mt-6">
              <div className="space-y-3 bg-zinc-50 p-4 rounded-xl border border-zinc-100 max-w-sm">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-zinc-400" /> Company's Bank Details
                </h4>
                <div className="text-xs text-zinc-850 space-y-1 leading-relaxed">
                  <p><span className="text-zinc-500 font-medium">Bank Name:</span> State Bank Of India</p>
                  <p><span className="text-zinc-500 font-medium">Payment to be made in name of:</span> Arpit Mudgal</p>
                  <p><span className="text-zinc-500 font-medium">A/c No:</span> 32179629084</p>
                  <p><span className="text-zinc-500 font-medium">Branch & IFS Code:</span> SBIN0004098</p>
                </div>
              </div>

              <div className="text-center w-48 space-y-1">
                <div className="h-12 flex items-center justify-center">
                  <img
                    src="/signature.png"
                    alt="Signature"
                    className="h-12 w-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="border-t border-zinc-200 pt-2 text-xs">
                  <p className="font-extrabold text-zinc-950">Arpit Mudgal</p>
                  <p className="text-[10px] text-zinc-500 font-medium mt-0.5">Signature (yourphotocrew- Founder)</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      </DialogContent>
    </Dialog>
  );
}

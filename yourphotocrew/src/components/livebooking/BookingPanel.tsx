import { Camera, Minus, Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { BookingData, Discount } from './types';
import { DiscountSection } from './DiscountSection';
import { TermsConditions } from './TermsConditions';
import { motion } from 'motion/react';

interface BookingPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingData: BookingData;
  onBookingChange: (data: BookingData) => void;
  discounts: Discount[];
  onDiscountsChange: (discounts: Discount[]) => void;
  termsAccepted: boolean;
  onTermsChange: (accepted: boolean) => void;
  expandedDiscounts: boolean;
  onToggleDiscounts: () => void;
  total: number;
  onProceed: () => void;
  whatsappSent: boolean;
}

interface BookingRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  price?: number;
}

function BookingRow({ label, value, onChange, price }: BookingRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-sm">{label}</div>
        {price && <div className="text-xs text-gray-500">₹{price}</div>}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30"
          disabled={value === 0}
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-8 text-center font-medium">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function BookingPanel({
  open,
  onOpenChange,
  bookingData,
  onBookingChange,
  discounts,
  onDiscountsChange,
  termsAccepted,
  onTermsChange,
  expandedDiscounts,
  onToggleDiscounts,
  total,
  onProceed,
  whatsappSent,
}: BookingPanelProps) {
  const updateBooking = (key: keyof BookingData, value: number) => {
    onBookingChange({ ...bookingData, [key]: value });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="border-b border-gray-200 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Get 'that' pic
          </SheetTitle>
          <SheetDescription className="text-sm text-gray-500">
            Choose your package and apply any discounts to get the best deal.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Customer Count Section */}
          <div>
            <h3 className="font-medium mb-2">Select package</h3>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
              <BookingRow
                label="Single"
                value={bookingData.single}
                onChange={(v) => updateBooking('single', v)}
                price={299}
              />
              <BookingRow
                label="Couple"
                value={bookingData.couple}
                onChange={(v) => updateBooking('couple', v)}
                price={499}
              />
              <BookingRow
                label="Group (3-5 people)"
                value={bookingData.group}
                onChange={(v) => updateBooking('group', v)}
                price={799}
              />
              <BookingRow
                label="Just hard copies"
                value={bookingData.hardCopy}
                onChange={(v) => updateBooking('hardCopy', v)}
                price={99}
              />
            </div>
            <p className="text-xs text-gray-500 italic mt-2">
              1 hard copy included per request
            </p>
          </div>

          {/* Discounts */}
          <DiscountSection
            expanded={expandedDiscounts}
            onToggle={onToggleDiscounts}
            discounts={discounts}
            onDiscountsChange={onDiscountsChange}
          />

          {/* Total */}
          <div className="flex items-center justify-between py-3 border-t border-gray-200">
            <span className="font-medium">Total</span>
            <span className="text-2xl">₹{total}</span>
          </div>

          {/* Terms & Conditions */}
          <TermsConditions
            accepted={termsAccepted}
            onAcceptChange={onTermsChange}
          />

          {/* WhatsApp Sent Message */}
          {whatsappSent && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 rounded-lg p-4 text-center"
            >
              <div className="text-sm text-green-800 mb-1">
                ✓ Message sent to photographer via WhatsApp
              </div>
              <div className="text-xs text-green-600">
                Now complete your payment to confirm booking
              </div>
            </motion.div>
          )}

          {/* CTA Button */}
          <button
            onClick={onProceed}
            disabled={!termsAccepted}
            className="w-full py-4 bg-black text-white rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
          >
            {!termsAccepted 
              ? 'Please accept terms to continue' 
              : whatsappSent 
              ? 'Complete Payment' 
              : "Let's give this a shot!"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Discount } from './types';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';

interface DiscountSectionProps {
  expanded: boolean;
  onToggle: () => void;
  discounts: Discount[];
  onDiscountsChange: (discounts: Discount[]) => void;
}

export function DiscountSection({ expanded, onToggle, discounts, onDiscountsChange }: DiscountSectionProps) {
  const [couponInputs, setCouponInputs] = useState(['', '']);

  const handleApplyCoupon = (index: number) => {
    const code = couponInputs[index].trim().toUpperCase();
    if (!code) return;

    // Mock discount logic
    const discountAmount = code === 'SAVE300' ? 300 : code === 'FIRST50' ? 50 : 100;
    
    const newDiscount: Discount = {
      id: `discount-${Date.now()}`,
      code,
      amount: discountAmount,
      applied: true,
    };

    onDiscountsChange([...discounts, newDiscount]);
    
    // Clear input
    const newInputs = [...couponInputs];
    newInputs[index] = '';
    setCouponInputs(newInputs);
  };

  const handleRemoveDiscount = (id: string) => {
    onDiscountsChange(discounts.filter(d => d.id !== id));
  };

  const totalDiscount = discounts.reduce((sum, d) => d.applied ? sum + d.amount : sum, 0);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-medium">
          Discount Offers {totalDiscount > 0 && `(-₹${totalDiscount})`}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Applied Discounts */}
              {discounts.map((discount) => (
                <div key={discount.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-green-800">
                      ₹{discount.amount} discount applied
                    </div>
                    <div className="text-xs text-green-600">{discount.code}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveDiscount(discount.id)}
                    className="text-sm text-green-700 hover:text-green-900"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {/* Coupon Inputs */}
              {couponInputs.map((value, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {index === 0 ? 'REPOST' : 'REVIEW'}
                    </span>
                    <Input
                      type="text"
                      placeholder="Enter code"
                      value={value}
                      onChange={(e) => {
                        const newInputs = [...couponInputs];
                        newInputs[index] = e.target.value;
                        setCouponInputs(newInputs);
                      }}
                      className="flex-1 text-sm"
                    />
                    <button
                      onClick={() => handleApplyCoupon(index)}
                      disabled={!value.trim()}
                      className="px-4 py-2 bg-black text-white text-sm rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 italic">
                    {index === 0 
                      ? 'Repost our photo on your social media to get a discount' 
                      : 'Write a review about your experience to get a discount'}
                  </p>
                </div>
              ))}

              <p className="text-xs text-gray-500 italic border-t border-gray-200 pt-3">
                Coupon applied privately by photographer after shoot
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
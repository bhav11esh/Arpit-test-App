import { useState } from 'react';
import { X } from 'lucide-react';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface TermsConditionsProps {
  accepted: boolean;
  onAcceptChange: (accepted: boolean) => void;
}

export function TermsConditions({ accepted, onAcceptChange }: TermsConditionsProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
        <Switch
          checked={accepted}
          onCheckedChange={onAcceptChange}
          id="terms"
        />
        <div className="flex-1">
          <label htmlFor="terms" className="text-sm cursor-pointer">
            I've read and agree to the{' '}
            <button
              onClick={(e) => {
                e.preventDefault();
                setModalOpen(true);
              }}
              className="text-blue-600 underline"
            >
              Terms & Conditions
            </button>
          </label>
          {!accepted && (
            <p className="text-xs text-gray-500 mt-1">
              Please accept terms to continue
            </p>
          )}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terms & Conditions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <section>
              <h4 className="font-medium mb-2">Service Agreement</h4>
              <p className="text-gray-600">
                This photography service is provided on a "try before you buy" basis. 
                You will review all photos before making any payment decision.
              </p>
            </section>

            <section>
              <h4 className="font-medium mb-2">Payment Terms</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Payment required only if you choose to keep photos</li>
                <li>No hidden charges or fees</li>
                <li>Refunds available within 24 hours</li>
                <li>Discounts applied after photographer review</li>
              </ul>
            </section>

            <section>
              <h4 className="font-medium mb-2">Photo Rights</h4>
              <p className="text-gray-600">
                You retain full rights to all purchased photos. We may use photos 
                for portfolio purposes with your permission.
              </p>
            </section>

            <section>
              <h4 className="font-medium mb-2">Cancellation</h4>
              <p className="text-gray-600">
                You may cancel at any time before the shoot begins. Once photos 
                are taken, review them before making a decision.
              </p>
            </section>

            <section>
              <h4 className="font-medium mb-2">Venue Requirements</h4>
              <p className="text-gray-600">
                Service available only within designated venue areas. Location 
                verification required for booking confirmation.
              </p>
            </section>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  onAcceptChange(true);
                  setModalOpen(false);
                }}
                className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Accept & Close
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

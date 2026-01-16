import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TermsModalProps {
  open: boolean;
  onClose: () => void;
}

export function TermsModal({ open, onClose }: TermsModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white rounded-lg shadow-xl z-50 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Terms & Conditions</h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4 text-sm text-gray-600">
                <section>
                  <h3 className="font-medium text-black mb-2">1. Introduction</h3>
                  <p>By scanning our QR code and using the services of yourphotocrew, you agree to the following terms and conditions. Please read them carefully before engaging with our service.</p>
                </section>

                <section>
                  <h3 className="font-medium text-black mb-2">2. Service Description</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Our photographer will approach you at the restaurant after you scan our QR code.</li>
                    <li>Photos will be taken only with your explicit consent.</li>
                    <li>After the photos are taken, they will be shown to you for review.</li>
                    <li>You are under no obligation to purchase the photos at this stage.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-medium text-black mb-2">3. Payment</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>If you choose the shoot service & you like your camera roll, you can choose to have it sent to you post payment.</li>
                    <li>Payment must be made in full after the clicks, before the hard copy is handed to you in a couple of minutes.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-medium text-black mb-2">4. Delivery of Edited Photos</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Once payment is received, the photos will be sent to you via the agreed method (google drive link).</li>
                    <li>Delivery time will be communicated to you at the time of purchase, typically within 24 hours.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-medium text-black mb-2">5. No Cost Prior to Purchase Decision</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>There is no cost for the initial photo-taking session.</li>
                    <li>You will only be charged if you choose to have the photos sent (drive link) or handed (i.e. hard copy) to you.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-medium text-black mb-2">6. Cancellation and Refund Policy</h3>
                  <p>Refund queries are not to be entertained.</p>
                </section>

                <section>
                  <h3 className="font-medium text-black mb-2">7. Usage of Photos</h3>
                  <p>yourphotocrew does not use your photos for marketing without prior consent. We respect your privacy and will not use your photos for any promotional or commercial purposes without your explicit consent.</p>
                </section>

                <section>
                  <h3 className="font-medium text-black mb-2">8. Liability</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>While we take great care in providing our services, we are not responsible for any dissatisfaction with the delivered photos (soft/hard copy) since the camera roll shown was agreed upon.</li>
                    <li>Our liability is limited to the cost of the services provided.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-medium text-black mb-2">9. Modification of Terms</h3>
                  <p>We reserve the right to modify these terms and conditions at any time. Any changes will be effective immediately upon posting the updated terms on our website or notifying you directly.</p>
                </section>

                <section>
                  <h3 className="font-medium text-black mb-2">10. Contact Information</h3>
                  <p>For any questions or concerns about these terms and conditions, please contact us at WA business contact <a href="https://wa.me/917676235229" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">+91-7676235229</a>.</p>
                </section>

                <section>
                  <h3 className="font-medium text-black mb-2">11. Copyright</h3>
                  <p>Copyright remains with the venue.</p>
                </section>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { format, startOfMonth, endOfMonth, endOfDay, min } = require('date-fns');
dotenv.config({ path: 'C:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// Helper for leaves
const isEmergencyLeave = (dateStr, half, appliedAtStr) => {
  if (!appliedAtStr) return false;
  const shiftStart = new Date(`${dateStr}T${half === 'FIRST_HALF' ? '10:00:00' : '14:00:00'}`);
  const appliedAt = new Date(appliedAtStr);
  const diffMs = shiftStart.getTime() - appliedAt.getTime();
  return diffMs < 24 * 60 * 60 * 1000; // Less than 24 hours notice
};

async function calculateMalliDays() {
  const malliId = 'bc268775-f79f-4400-b10b-bea4ba1dc762';
  const selectedMonth = new Date('2026-05-01T00:00:00');

  // 1. Get deliveries (same filter as frontend)
  const { data: deliveriesRaw, error: dError } = await supabase
    .from('deliveries')
    .select('*')
    .eq('assigned_user_id', malliId)
    .eq('status', 'DONE')
    .is('deleted_at', null);

  if (dError) throw dError;

  const fromStr = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const toDate = min([new Date(), endOfMonth(selectedMonth)]);
  const toStr = format(endOfDay(toDate), 'yyyy-MM-dd');

  const filtered = deliveriesRaw.filter(d => d.date >= fromStr && d.date <= toStr);
  console.log(`Filtered May deliveries: ${filtered.length}`);
  const deliveryDates = filtered.map(d => d.date);

  // 2. Get leaves (same filter as frontend)
  const { data: leavesRaw, error: lError } = await supabase
    .from('leaves')
    .select('*')
    .eq('photographer_id', malliId)
    .gte('date', fromStr)
    .lte('date', toStr);

  if (lError) throw lError;

  const convertedLeaveDays = leavesRaw
    .filter(l => l.converted_to_working_day)
    .map(l => l.date);
  const uniqueConvertedLeaveDays = Array.from(new Set(convertedLeaveDays));

  console.log('Leaves raw count:', leavesRaw.length);
  console.log('Converted leave days:', uniqueConvertedLeaveDays);

  const daysWorkedList = Array.from(new Set([
    ...deliveryDates,
    ...uniqueConvertedLeaveDays
  ]));

  console.log('\n--- Final Days Worked List ---');
  console.log(`Length: ${daysWorkedList.length}`);
  console.log(daysWorkedList.sort());
}

calculateMalliDays().catch(console.error);

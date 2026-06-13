const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: 'C:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function testNewCarryForward() {
  const pId = 'bc268775-f79f-4400-b10b-bea4ba1dc762';
  const fromStr = '2026-05-01';
  const toStr = '2026-05-31';

  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('date')
    .eq('assigned_user_id', pId)
    .eq('status', 'DONE')
    .is('deleted_at', null)
    .gte('date', fromStr)
    .lte('date', toStr);

  const { data: leaves } = await supabase
    .from('leaves')
    .select('date, half')
    .eq('photographer_id', pId)
    .gte('date', fromStr)
    .lte('date', toStr);

  const sortedLeaves = [...leaves].sort((a, b) => a.date.localeCompare(b.date));

  // --- NEW LOGIC ---
  const tuesdayDeliveriesCount = new Map();
  deliveries.forEach(d => {
    const dateObj = new Date(d.date);
    if (dateObj.getDay() === 2) {
      tuesdayDeliveriesCount.set(d.date, (tuesdayDeliveriesCount.get(d.date) || 0) + 1);
    }
  });

  const workedTuesdays = Array.from(tuesdayDeliveriesCount.keys()).sort();
  
  let availableCarryForwardHalves = 0;
  tuesdayDeliveriesCount.forEach((count) => {
    if (count === 1) {
      availableCarryForwardHalves += 1;
    } else if (count >= 2) {
      availableCarryForwardHalves += 2;
    }
  });

  console.log('--- NEW LOGIC STATS ---');
  console.log('Worked Tuesdays:', workedTuesdays);
  console.log('Tuesday Deliveries Count:', Object.fromEntries(tuesdayDeliveriesCount));
  console.log('availableCarryForwardHalves calculated:', availableCarryForwardHalves);

  const carryForwardedDates = new Set();
  sortedLeaves.forEach(l => {
    const leaveDate = new Date(l.date);
    if (leaveDate.getDay() !== 2 && l.date >= fromStr && l.date <= toStr) {
      if (availableCarryForwardHalves > 0) {
        availableCarryForwardHalves--;
        carryForwardedDates.add(l.date);
      }
    }
  });

  console.log('carryForwardedDates size:', carryForwardedDates.size);
  console.log('carryForwardedDates:', Array.from(carryForwardedDates));
}

testNewCarryForward();

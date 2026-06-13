const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { format, startOfMonth, endOfMonth, endOfDay, min } = require('date-fns');
dotenv.config({ path: 'C:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function testVars() {
  const pId = 'bc268775-f79f-4400-b10b-bea4ba1dc762';
  const selectedMonth = new Date('2026-05-01T00:00:00');
  const fromStr = '2026-05-01';
  const toStr = '2026-05-31';

  // Deliveries
  const { data: pDeliveries } = await supabase
    .from('deliveries')
    .select('*')
    .eq('assigned_user_id', pId)
    .eq('status', 'DONE')
    .is('deleted_at', null)
    .gte('date', fromStr)
    .lte('date', toStr);

  // Leaves
  const { data: pLeaves } = await supabase
    .from('leaves')
    .select('*')
    .eq('photographer_id', pId)
    .gte('date', fromStr)
    .lte('date', toStr);

  const getPayoutModelForDate = (dateStr) => 'PERCENTAGE';

  const sortedLeaves = [...pLeaves].sort((a, b) => a.date.localeCompare(b.date));
  const workedTuesdays = Array.from(new Set(
      pDeliveries.filter(d => new Date(d.date).getDay() === 2).map(d => d.date)
  )).sort();
  
  let availableCarryForwardHalves = workedTuesdays.length * 2;
  const carryForwardedDates = new Set();
  
  console.log(`Worked Tuesdays (${workedTuesdays.length}):`, workedTuesdays);
  console.log(`Initial availableCarryForwardHalves: ${availableCarryForwardHalves}`);

  sortedLeaves.forEach((l, idx) => {
      const model = getPayoutModelForDate(l.date);
      const leaveDate = new Date(l.date);
      let isForgiven = false;

      // Note: leaveDate.getDay() in JS is local time. 
      // If l.date is '2026-05-03', new Date('2026-05-03') gives Sunday (Day 0) in UTC, but locally:
      const dayOfWeek = leaveDate.getDay(); 

      console.log(`\nProcessing Leaf ${idx}: Date=${l.date}, Half=${l.half}, DayOfWeek=${dayOfWeek}`);

      if (dayOfWeek !== 2 && l.date >= fromStr && l.date <= toStr) {
          if (availableCarryForwardHalves > 0) {
              availableCarryForwardHalves--;
              carryForwardedDates.add(l.date);
              isForgiven = true;
              console.log(`  -> FORGIVEN! carryForwardedDates.add(${l.date}). Remaining carry forward halves: ${availableCarryForwardHalves}`);
          } else {
              console.log(`  -> NOT FORGIVEN (no carry-forward halves left)`);
          }
      } else {
          console.log(`  -> NOT FORGIVEN (is Tuesday or out of range)`);
      }
  });

  let forgivenLeavesPctHalves = 0;
  carryForwardedDates.forEach(dateStr => {
      if (getPayoutModelForDate(dateStr) === 'PERCENTAGE') {
          forgivenLeavesPctHalves++;
      }
  });

  const totalAppliedLeavesPctHalves = pLeaves.length;
  console.log('\n--- Final stats ---');
  console.log('totalAppliedLeavesPctHalves:', totalAppliedLeavesPctHalves);
  console.log('carryForwardedDates:', Array.from(carryForwardedDates));
  console.log('forgivenLeavesPctHalves:', forgivenLeavesPctHalves);

  const daysWorkedCount = 31 - ((totalAppliedLeavesPctHalves - forgivenLeavesPctHalves) / 2);
  console.log('daysWorkedCount calculated:', daysWorkedCount);
}

testVars();

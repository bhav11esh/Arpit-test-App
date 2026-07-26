const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { format, startOfMonth, endOfMonth, endOfDay, min } = require('date-fns');
dotenv.config({ path: 'C:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// Copying utility functions from utils
const getShowroomCode = (name) => {
  if (!name) return '';
  return name.toUpperCase().replace(/\s+/g, '_');
};

const isEmergencyLeave = (dateStr, half, appliedAtStr) => {
  if (!appliedAtStr) return false;
  const shiftStart = new Date(`${dateStr}T${half === 'FIRST_HALF' ? '10:00:00' : '14:00:00'}`);
  const appliedAt = new Date(appliedAtStr);
  const diffMs = shiftStart.getTime() - appliedAt.getTime();
  return diffMs < 24 * 60 * 60 * 1000;
};

async function testStats() {
  const pId = 'bc268775-f79f-4400-b10b-bea4ba1dc762'; // Mallikarjun
  const selectedMonth = new Date('2026-05-01T00:00:00');
  
  const fromStr = '2026-05-01';
  const toStr = '2026-05-31';

  // 1. Fetch dealerships
  const { data: dealerships } = await supabase.from('dealerships').select('*');

  // 2. Fetch deliveries
  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('*')
    .eq('assigned_user_id', pId)
    .eq('status', 'DONE')
    .is('deleted_at', null)
    .gte('date', fromStr)
    .lte('date', toStr);

  console.log(`Raw Deliveries count: ${deliveries.length}`);

  let gross = 0;
  let rapidoTotal = 0;
  const breakdownMap = new Map();

  deliveries.forEach(d => {
    const dealership = dealerships.find(ds => getShowroomCode(ds.name) === d.showroom_code);
    const rate = d.payment_type === 'CUSTOMER_PAID'
        ? (Number(d.received_amount) || 0)
        : (d.received_amount !== undefined && d.received_amount !== null 
            ? Number(d.received_amount) 
            : (dealership?.rate_per_delivery || 0));

    gross += rate;
    const charge = d.rapido_charge || 0;
    rapidoTotal += charge;

    const dsName = dealership?.name || d.showroom_code || 'Unknown Showroom';
    const current = breakdownMap.get(dsName) || { count: 0, rate: 0, rapido: 0 };
    current.count += 1;
    current.rate += rate;
    current.rapido += charge;
    breakdownMap.set(dsName, current);
  });

  console.log(`Gross Earnings: ${gross}`);
  console.log(`Total Rapido: ${rapidoTotal}`);
  console.log('Breakdown:', Array.from(breakdownMap.entries()));

  // 3. Fetch leaves
  const { data: pLeaves } = await supabase
    .from('leaves')
    .select('*')
    .eq('photographer_id', pId)
    .gte('date', fromStr)
    .lte('date', toStr);

  // 4. Fetch forgiven
  const { data: pForgiven } = await supabase
    .from('penalty_forgiveness')
    .select('*')
    .eq('photographer_id', pId)
    .eq('month', '2026-05');

  const forgivenTypes = pForgiven.map(f => f.penalty_type);
  console.log('Forgiven penalty types:', forgivenTypes);

  // 5. Fetch reel tasks
  const { data: reelTasksData } = await supabase
    .from('reel_tasks')
    .select('*, deliveries!inner(date)')
    .eq('status', 'RESOLVED')
    .gte('deliveries.date', fromStr)
    .lte('deliveries.date', toStr);

  const pReelTasks = (reelTasksData || []).filter(rt => rt.assigned_user_id === pId || rt.original_user_id === pId);

  // 6. Fetch missed updates
  const { data: pMissedUpdates } = await supabase.rpc('get_photographer_missing_updates', {
    p_photographer_id: pId,
    p_start_date: fromStr,
    p_end_date: toStr
  });

  // RUN CALCULATIONS EXACTLY AS IN THE CODE
  const sortedLeaves = [...pLeaves].sort((a, b) => a.date.localeCompare(b.date));
  const workedTuesdays = Array.from(new Set(
      deliveries.filter(d => new Date(d.date).getDay() === 2).map(d => d.date)
  )).sort();
  
  let availableCarryForwardHalves = workedTuesdays.length * 2;
  const carryForwardedDates = new Set();
  let totalEmergencyHalves = 0;
  let unpaidLeavesDeductionFixed = 0;
  let unpaidLeavesDeductionPctHalves = 0;
  const emergencyByMonthPct = new Map();
  const emergencyByMonthFixed = new Map();

  sortedLeaves.forEach(l => {
      const model = 'PERCENTAGE';
      const leaveDate = new Date(l.date);
      let isForgiven = false;

      if (leaveDate.getDay() !== 2 && l.date >= fromStr && l.date <= toStr) {
          if (availableCarryForwardHalves > 0) {
              availableCarryForwardHalves--;
              carryForwardedDates.add(l.date);
              isForgiven = true;
              if (model === 'PERCENTAGE') {
                  unpaidLeavesDeductionPctHalves++;
              }
          } else {
              if (model === 'FIXED') {
                  unpaidLeavesDeductionFixed += 500;
              }
          }
      }

      if (!isForgiven && isEmergencyLeave(l.date, l.half, l.applied_at)) {
          totalEmergencyHalves++;
          const monthKey = l.date.substring(0, 7);
          if (model === 'PERCENTAGE') {
              emergencyByMonthPct.set(monthKey, (emergencyByMonthPct.get(monthKey) || 0) + 1);
          } else {
              emergencyByMonthFixed.set(monthKey, (emergencyByMonthFixed.get(monthKey) || 0) + 1);
          }
      }
  });

  let penaltyPct = 0;
  const isEmergencyLeaveForgiven = forgivenTypes.includes('EMERGENCY_LEAVE');
  const isSendUpdateForgiven = forgivenTypes.includes('SEND_UPDATE');

  if (!isEmergencyLeaveForgiven) {
      emergencyByMonthPct.forEach(count => { if (count > 6) penaltyPct += (count - 6) * 250; });
  }

  let missedUpdatesCount = 0;
  let missedUpdatesPenaltyPct = 0;

  pMissedUpdates.forEach((mu) => {
      if (mu.missing_date >= '2026-05-05') {
          const dateObj = new Date(mu.missing_date);
          const isTuesday = dateObj.getDay() === 2;
          const isWorkedTuesday = workedTuesdays.includes(mu.missing_date);
          const isCarryForwarded = carryForwardedDates.has(mu.missing_date);

          if (isTuesday && !isWorkedTuesday) return;
          if (isCarryForwarded) return;

          missedUpdatesCount++;
          if (!isSendUpdateForgiven) {
              missedUpdatesPenaltyPct += 1000;
          }
      }
  });

  penaltyPct += missedUpdatesPenaltyPct;

  let postItBonus = 0;
  let postItPenalty = 0;
  pReelTasks.forEach((rt) => {
      if (rt.assigned_user_id === pId && rt.original_user_id !== null && rt.original_user_id !== rt.assigned_user_id) postItBonus += rt.post_it_reward || 0;
      if (rt.original_user_id === pId && rt.assigned_user_id !== rt.original_user_id) postItPenalty += rt.post_it_reward || 0;
  });

  gross += postItBonus;
  penaltyPct += postItPenalty;

  // Model calculations
  let totalCalendarDaysPct = 0;
  for (let d = startOfMonth(selectedMonth); d <= min([new Date(), endOfMonth(selectedMonth)]); d = new Date(d.getTime() + 86400000)) {
      totalCalendarDaysPct++;
  }

  let totalAppliedLeavesPctHalves = 0;
  sortedLeaves.forEach(l => {
      if (l.date >= fromStr && l.date <= toStr) {
          totalAppliedLeavesPctHalves++;
      }
  });

  let forgivenLeavesPctHalves = 0;
  carryForwardedDates.forEach(dateStr => {
      forgivenLeavesPctHalves++;
  });

  const daysWorkedCount = totalCalendarDaysPct - ((totalAppliedLeavesPctHalves - forgivenLeavesPctHalves) / 2);
  const salaryBenchmark = daysWorkedCount * 1000;
  
  const netAmountPool = gross - rapidoTotal - penaltyPct;
  const tier1 = Math.min(netAmountPool, salaryBenchmark);
  const tier2 = Math.max(0, Math.min(netAmountPool - salaryBenchmark, salaryBenchmark));
  const tier3 = Math.max(0, netAmountPool - (2 * salaryBenchmark));

  let adminSharePct = (tier1 * 0.10) + (tier2 * 0.30) + (tier3 * 0.50);
  let photographerSharePct = (tier1 * 0.90) + (tier2 * 0.70) + (tier3 * 0.50);

  let settledPct = deliveries.filter(d => d.payment_type === 'CUSTOMER_PAID').reduce((acc, d) => acc + ((d.received_amount || 0) * 0.3), 0);
  let dealerRevPct = deliveries.filter(d => d.payment_type !== 'CUSTOMER_PAID').reduce((acc, d) => {
      const dealership = dealerships.find(ds => getShowroomCode(ds.name) === d.showroom_code);
      return acc + (d.received_amount !== undefined && d.received_amount !== null ? Number(d.received_amount) : (dealership?.rate_per_delivery || 0));
  }, 0);
  
  let amountPendingPct = adminSharePct - settledPct - dealerRevPct;

  console.log('\n--- CALCULATED VALUES ---');
  console.log('totalCalendarDaysPct:', totalCalendarDaysPct);
  console.log('totalAppliedLeavesPctHalves:', totalAppliedLeavesPctHalves);
  console.log('forgivenLeavesPctHalves:', forgivenLeavesPctHalves);
  console.log('daysWorkedCount:', daysWorkedCount);
  console.log('salaryBenchmark:', salaryBenchmark);
  console.log('netAmountPool:', netAmountPool);
  console.log('tier1:', tier1, 'tier2:', tier2, 'tier3:', tier3);
  console.log('photographerSharePct:', photographerSharePct);
  console.log('adminSharePct:', adminSharePct);
  console.log('settledPct:', settledPct);
  console.log('dealerRevPct:', dealerRevPct);
  console.log('amountPendingPct:', amountPendingPct);
}

testStats();

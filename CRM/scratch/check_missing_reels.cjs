const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkMissingReels() {
  const fourDaysAgo = new Date();
  fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
  const dateStr = fourDaysAgo.toISOString().split('T')[0];

  console.log(`Checking for deliveries before ${dateStr} with missing reel links...`);

  // We want to find deliveries before 4 days ago that don't have a reel link
  const { data: deliveries, error } = await supabase
    .from('deliveries')
    .select(`
      id,
      date,
      assigned_user_id,
      showroom_code,
      footage_link,
      reel_link
    `)
    .lte('date', dateStr)
    .is('reel_link', null);

  if (error) {
    console.error('Error fetching deliveries:', error);
    return;
  }

  // Also check if reel_link is empty string, if any
  const missingReels = deliveries.filter(d => !d.reel_link || d.reel_link.trim() === '');

  console.log(`Found ${missingReels.length} deliveries missing reel links older than 4 days.`);

  // Let's also check if they have reel_tasks
  const deliveryIds = missingReels.map(d => d.id);
  
  let tasksByDelivery = {};
  if (deliveryIds.length > 0) {
    const { data: tasks, error: tasksError } = await supabase
      .from('reel_tasks')
      .select('id, delivery_id, status')
      .in('delivery_id', deliveryIds);
      
    if (tasksError) {
      console.error('Error fetching reel tasks:', tasksError);
    } else {
      tasks.forEach(t => {
        if (!tasksByDelivery[t.delivery_id]) tasksByDelivery[t.delivery_id] = [];
        tasksByDelivery[t.delivery_id].push(t);
      });
    }
  }

  const result = missingReels.map(d => ({
    id: d.id,
    date: d.date,
    photographer: d.assigned_user_id,
    dealership: d.showroom_code,
    has_footage: !!(d.footage_link && d.footage_link.trim() !== ''),
    has_reel_task: !!tasksByDelivery[d.id]
  }));

  const grouped = {};
  result.forEach(r => {
    const key = `${r.photographer} - ${r.dealership}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  for (const key in grouped) {
    console.log(`\n--- ${key} ---`);
    grouped[key].forEach(r => {
      console.log(`Date: ${r.date}, ID: ${r.id}, Has Footage: ${r.has_footage}, Has Reel Task: ${r.has_reel_task}`);
    });
  }
}

checkMissingReels();

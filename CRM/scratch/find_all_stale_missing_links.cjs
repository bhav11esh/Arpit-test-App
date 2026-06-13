const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkStaleDeliveries() {
  console.log('--- SCANNING FOR STALE DELIVERIES WITH MISSING REEL LINKS (>4 DAYS AGO) ---');

  // 1. Fetch users to map IDs to names
  const { data: users, error: uError } = await supabase
    .from('users')
    .select('id, name, email');
    
  if (uError) {
    console.error('Error fetching users:', uError);
    return;
  }
  const userMap = {};
  users.forEach(u => userMap[u.id] = u);

  // 2. Fetch all DONE deliveries that are older than 4 days (date <= '2026-05-21')
  // We check for null or empty reel links
  const { data: deliveries, error: dError } = await supabase
    .from('deliveries')
    .select('*')
    .eq('status', 'DONE')
    .lte('date', '2026-05-21');

  if (dError) {
    console.error('Error fetching deliveries:', dError);
    return;
  }

  // Filter deliveries that have no reel link
  const staleDeliveries = deliveries.filter(d => !d.reel_link || d.reel_link.trim() === '' || d.reel_link.toLowerCase().includes('pending'));

  console.log(`Found ${staleDeliveries.length} stale completed deliveries with missing reel links.`);

  // 3. For each stale delivery, check if a reel task exists
  const deliveryIds = staleDeliveries.map(d => d.id);
  const taskMap = {};
  
  if (deliveryIds.length > 0) {
    // Fetch reel tasks in chunks of 50 to avoid limits
    const chunkSize = 50;
    for (let i = 0; i < deliveryIds.length; i += chunkSize) {
      const chunk = deliveryIds.slice(i, i + chunkSize);
      const { data: tasks, error: tError } = await supabase
        .from('reel_tasks')
        .select('*')
        .in('delivery_id', chunk);
        
      if (tError) {
        console.error('Error fetching reel tasks chunk:', tError);
      } else if (tasks) {
        tasks.forEach(t => {
          taskMap[t.delivery_id] = t;
        });
      }
    }
  }

  // 4. Group and format results
  const groupedResults = {};

  staleDeliveries.forEach(d => {
    const photogName = d.assigned_user_id ? (userMap[d.assigned_user_id]?.name || 'Unknown Photographer') : 'Unassigned';
    const showroom = d.showroom_code || 'Unknown Showroom';
    
    if (!groupedResults[photogName]) {
      groupedResults[photogName] = {};
    }
    if (!groupedResults[photogName][showroom]) {
      groupedResults[photogName][showroom] = [];
    }

    const task = taskMap[d.id];
    groupedResults[photogName][showroom].push({
      id: d.id,
      date: d.date,
      name: d.delivery_name,
      footage: d.footage_link || 'No footage link',
      hasTask: !!task,
      taskStatus: task ? task.status : 'No Task',
      isPostIt: task ? task.is_post_it : false,
      taskAssignedTo: task ? (userMap[task.assigned_user_id]?.name || 'Unknown') : 'N/A'
    });
  });

  // 5. Output Summary
  console.log('\n--- SUMMARY BY PHOTOGRAPHER AND DEALERSHIP ---');
  for (const photog in groupedResults) {
    console.log(`\nPhotographer: ${photog}`);
    for (const showroom in groupedResults[photog]) {
      const items = groupedResults[photog][showroom];
      console.log(`  Dealership: ${showroom} (${items.length} deliveries)`);
      items.forEach(item => {
        console.log(`    - Date: ${item.date}, Name: ${item.name}`);
        console.log(`      Footage: ${item.footage}`);
        console.log(`      Task Status: ${item.taskStatus} (Is Post-it: ${item.isPostIt}, Assigned to: ${item.taskAssignedTo})`);
      });
    }
  }

  // 6. Save detailed output to JSON for further inspection if needed
  const fs = require('fs');
  fs.writeFileSync('stale_deliveries_report.json', JSON.stringify(groupedResults, null, 2));
  console.log('\nReport written to stale_deliveries_report.json');
}

checkStaleDeliveries();

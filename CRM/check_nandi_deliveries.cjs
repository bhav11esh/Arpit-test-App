const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envStr = fs.readFileSync('.env', 'utf8');
const url = envStr.match(/VITE_SUPABASE_URL=([^\r\n]+)/)[1].trim();
const key = envStr.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data: users } = await supabase.from('users').select('*');
  const userMap = {};
  users.forEach(u => userMap[u.id] = u.name);

  const dates = ['2026-05-13', '2026-05-25'];

  for (const date of dates) {
    console.log(`\n=== DATE: ${date} ===`);
    
    // Query deliveries
    const { data: deliveries, error: delError } = await supabase
      .from('deliveries')
      .select('*')
      .eq('date', date)
      .ilike('showroom_code', '%NANDI%');

    if (delError) {
      console.error('Error fetching deliveries:', delError);
      continue;
    }

    console.log(`Deliveries found: ${deliveries.length}`);
    for (const d of deliveries) {
      console.log(`Delivery ID: ${d.id}`);
      console.log(`- Name: ${d.delivery_name}`);
      console.log(`- Assigned User: ${userMap[d.assigned_user_id]} (${d.assigned_user_id})`);
      console.log(`- Status: ${d.status}`);
      console.log(`- Reel Link: ${d.reel_link}`);

      // Query reel tasks for this delivery
      const { data: tasks, error: taskError } = await supabase
        .from('reel_tasks')
        .select('*')
        .eq('delivery_id', d.id);

      if (taskError) {
        console.error('Error fetching reel tasks:', taskError);
        continue;
      }

      console.log(`- Reel Tasks count: ${tasks.length}`);
      for (const t of tasks) {
        console.log(`  * Task ID: ${t.id}`);
        console.log(`  * Assigned User: ${userMap[t.assigned_user_id]} (${t.assigned_user_id})`);
        console.log(`  * Original User: ${userMap[t.original_user_id]} (${t.original_user_id})`);
        console.log(`  * Status: ${t.status}`);
      }
    }
  }
}
run();

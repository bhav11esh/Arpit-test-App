const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('C:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env.local', 'utf8');
const url = env.split(/\r?\n/).find(l => l && l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')).split('=')[1].trim();
const key = env.split(/\r?\n/).find(l => l && l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')).split('=')[1].trim();

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('deliveries').select('id, date, showroom_code, footage_link, delivery_name').ilike('showroom_code', '%Apple%');
  console.log(`Total Apple Deliveries: ${data.length}`);

  // deduplicate by delivery_name and date
  const unique = new Set();
  const dupes = [];
  data.forEach(d => {
    const key = `${d.date}_${d.delivery_name}`;
    if (unique.has(key)) dupes.push(key);
    unique.add(key);
  });
  console.log(`Total Unique Keys: ${unique.size}`);
  console.log(`Total Dupe Keys: ${dupes.length}`);
}
check();

require('dotenv').config();

async function run() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Missing env vars');
    return;
  }

  const userId = 'bc268775-f79f-4400-b10b-bea4ba1dc762';

  console.log('Fetching reel tasks for Mallikarjun...');
  const res = await fetch(`${url}/rest/v1/reel_tasks?assigned_user_id=eq.${userId}&status=eq.PENDING&select=*,deliveries(*)`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });

  if (!res.ok) {
    console.error('Fetch failed:', res.status, await res.text());
    return;
  }

  const data = await res.json();
  console.log(`Found ${data.length} pending reel tasks.`);
  data.forEach(r => {
    console.log(`- Reel ID: ${r.id}, Delivery Date: ${r.deliveries?.date}, Status: ${r.status}`);
  });
}

run();

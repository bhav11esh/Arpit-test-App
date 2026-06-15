const fs = require('fs');
const envStr = fs.readFileSync('.env', 'utf8');
const url = envStr.match(/VITE_SUPABASE_URL=([^\r\n]+)/)[1].trim();
const key = envStr.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/)[1].trim();

async function run() {
  try {
    const res = await fetch(url + '/rest/v1/users?email=eq.arpitmudgal24@gmail.com', {
      method: 'PATCH',
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ role: 'ADMIN', active: true })
    });
    const data = await res.json();
    console.log('Update Status:', res.status, data);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}
run();

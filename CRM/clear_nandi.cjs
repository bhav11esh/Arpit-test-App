const fs = require('fs');
const envStr = fs.readFileSync('.env', 'utf8');
const url = envStr.match(/VITE_SUPABASE_URL=([^\r\n]+)/)[1].trim();
const key = envStr.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/)[1].trim();

async function run() {
  const targets = ['NANDI_TOYOTA', 'Nandi toyota'];
  for (const code of targets) {
    console.log('Deleting for:', code);
    try {
      const res = await fetch(${url}/rest/v1/deliveries?showroom_code=eq., {
        method: 'DELETE',
        headers: {
          'apikey': key,
          'Authorization': 'Bearer ' + key
        }
      });
      console.log('Status for', code, ':', res.status);
    } catch (e) {
      console.error('Error for', code, ':', e.message);
    }
  }
}
run();

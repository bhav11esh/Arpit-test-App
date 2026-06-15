const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envStr = fs.readFileSync('.env', 'utf8');
const url = envStr.match(/VITE_SUPABASE_URL=([^\r\n]+)/)[1].trim();
const key = envStr.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error(error);
    return;
  }
  const user = data.users.find(u => u.email && u.email.toLowerCase().includes('arpitmudgal'));
  if (user) {
    console.log('FOUND:', JSON.stringify({id: user.id, email: user.email}, null, 2));
  } else {
    console.log('NOT_FOUND');
    console.log('All users:', data.users.map(u => u.email).join(', '));
  }
}
run();

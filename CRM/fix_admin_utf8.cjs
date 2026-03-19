const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envStr = fs.readFileSync('.env', 'utf8');

const urlMatch = envStr.match(/VITE_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = envStr.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);

const url = urlMatch ? urlMatch[1].trim() : null;
const key = keyMatch ? keyMatch[1].trim() : null;

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('List users error:', error);
    return;
  }
  
  const user = data.users.find(u => u.email === 'arpitmudgal24@gmail.com');
  if (user) {
    console.log('Found UID:', user.id);
    const { error: insErr } = await supabase.from('users').insert({
      id: user.id, email: user.email, name: 'Arpit Mudgal', role: 'ADMIN', active: true
    });
    console.log('Insert public.users:', insErr ? insErr.message : 'Success');
  } else {
    console.log('User not found in auth.users');
  }
}
run();

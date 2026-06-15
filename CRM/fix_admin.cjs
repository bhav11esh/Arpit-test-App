const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

let envStr = fs.readFileSync('.env.local', 'utf8');
if (envStr.includes('\0')) {
  envStr = fs.readFileSync('.env.local', 'utf16le');
}

let urlMatch = envStr.match(/VITE_SUPABASE_URL=([^\r\n]+)/);
let keyMatch = envStr.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);

let url = urlMatch ? urlMatch[1].trim() : null;
let key = keyMatch ? keyMatch[1].trim() : null;

// Strip quotes if present
if (url) url = url.replace(/^"/, '').replace(/"$/, '');
if (key) key = key.replace(/^"/, '').replace(/"$/, '');

if (!url || !key) {
  console.error('Failed to parse URL or Key from .env.local');
  process.exit(1);
}

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
      id: user.id,
      email: user.email,
      name: 'Arpit Mudgal',
      role: 'ADMIN',
      active: true
    });
    console.log('Insert public.users:', insErr ? insErr.message : 'Success');
  } else {
    console.log('User not found in auth.users');
  }
}

run();

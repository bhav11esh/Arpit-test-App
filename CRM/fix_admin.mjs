import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');

const urlMatch = envFile.match(/VITE_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = envFile.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);

const url = urlMatch ? urlMatch[1] : null;
// Remove any surrounding quotes from the key
const key = keyMatch ? keyMatch[1].replace(/^"|'|`/, '').replace(/"|'|`$/, '') : null;

if (!url || !key) {
  console.error('URL or Key missing!');
  process.exit(1);
}

const supabase = createClient(url, key);

async function fixUser() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('List Users Error:', error);
    return;
  }
  
  const user = data.users.find(u => u.email === 'arpitmudgal24@gmail.com');
  if (user) {
    console.log('Found user UID:', user.id);
    const { error: insertError } = await supabase.from('users').insert({
      id: user.id, 
      email: user.email, 
      name: 'Arpit Mudgal', 
      role: 'ADMIN', 
      active: true
    });
    console.log('Inserted into public.users:', !insertError ? 'Success' : insertError.message);
  } else {
    console.log('User not found in auth.users');
  }
}

fixUser();

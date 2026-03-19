const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envStr = fs.readFileSync('.env', 'utf8');
const url = envStr.match(/VITE_SUPABASE_URL=([^\r\n]+)/)[1].trim();
const key = envStr.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/)[1].trim();
const supabase = createClient(url, key);
supabase.from('users').select('*').eq('id', '45521a5c-c2a7-4b91-a465-cb69f4224e78').then(({data, error}) => {
  if (error) console.error('Error fetching user:', error);
  else console.log('User Data:', data);
});

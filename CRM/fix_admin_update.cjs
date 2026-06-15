const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envStr = fs.readFileSync('.env', 'utf8');
const urlMatch = envStr.match(/VITE_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = envStr.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);
const url = urlMatch[1].trim();
const key = keyMatch[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { error: updErr } = await supabase.from('users').update({ role: 'ADMIN', active: true }).eq('id', '45521a5c-c2a7-4b91-a465-cb69f4224e78');
  console.log('Update result:', updErr ? updErr : 'Success');
}
run();

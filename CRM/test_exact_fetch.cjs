const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

async function testFetch() {
  const url = 'https://amikduuczgnirbnzuvtc.supabase.co/rest/v1/dealerships?select=*&order=name.asc.nullslast';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  const res = await fetch(url, {
    headers: {
      'apikey': anonKey,
      'Authorization': 'Bearer ' + anonKey
    }
  });
  
  const data = await res.json();
  const vw = data.find(d => typeof d.name === 'string' && d.name.includes('Apple'));
  console.log('Apple Auto VW Record:', vw);
}
testFetch();

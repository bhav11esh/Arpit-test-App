const dotenv = require('dotenv');
dotenv.config();
fetch('https://amikduuczgnirbnzuvtc.supabase.co/rest/v1/dealerships?select=*&name=ilike.*Volkswagen*', {
  headers: {
    'apikey': process.env.VITE_SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_ANON_KEY
  }
}).then(r => r.json()).then(console.log);

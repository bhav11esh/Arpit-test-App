
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: clusters } = await supabase.from('clusters').select('*');
    console.log('CLUSTERS:', clusters.map(c => `${c.id}:${c.name}`));

    const { data: users } = await supabase.from('users').select('*').eq('email', 'pavanmanne735@gmail.com');
    console.log('USER:', users);

    const { data: deliveries } = await supabase.from('deliveries').select('*').order('created_at', { ascending: false }).limit(5);
    console.log('LATEST DELIVERIES:', deliveries.map(d => `${d.delivery_name}|${d.cluster_code}|${d.status}`));
}

run();

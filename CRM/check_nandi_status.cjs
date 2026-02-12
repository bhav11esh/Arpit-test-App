require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNandiStatus() {
    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('status')
        .ilike('delivery_name', '%Nandi%');

    if (error) { console.error(error); return; }

    const counts = {};
    deliveries.forEach(d => {
        const s = d.status || 'NULL';
        counts[s] = (counts[s] || 0) + 1;
    });

    fs.writeFileSync('nandi_status.json', JSON.stringify(counts, null, 2));
}

checkNandiStatus();

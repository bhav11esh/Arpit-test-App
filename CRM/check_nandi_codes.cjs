require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNandiCodes() {
    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('showroom_code')
        .ilike('delivery_name', '%Nandi%');

    if (error) { console.error(error); return; }

    const counts = {};
    deliveries.forEach(d => {
        const code = d.showroom_code || 'NULL';
        counts[code] = (counts[code] || 0) + 1;
    });

    fs.writeFileSync('nandi_codes.json', JSON.stringify(counts, null, 2));
}

checkNandiCodes();

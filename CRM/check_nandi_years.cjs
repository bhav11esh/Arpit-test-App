require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNandiYears() {
    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('date')
        .ilike('delivery_name', '%Nandi%');

    if (error) { console.error(error); return; }

    const counts = {};
    deliveries.forEach(d => {
        const year = d.date.substring(0, 4);
        counts[year] = (counts[year] || 0) + 1;
    });

    fs.writeFileSync('nandi_years.json', JSON.stringify(counts, null, 2));
}

checkNandiYears();

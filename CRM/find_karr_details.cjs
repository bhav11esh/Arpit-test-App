
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function findKarr() {
    console.log('--- SEARCHING FOR SKODA KARR ---');

    // Search for 'Karr'
    const { data: karr, error } = await supabase
        .from('dealerships')
        .select('id, name, google_sheet_id')
        .ilike('name', '%Karr%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${karr.length} matches for '%Karr%':`);
    karr.forEach(d => console.log(`- NAME: ${d.name}\n  ID: ${d.id}\n  SHEET: ${d.google_sheet_id}\n`));
}

findKarr();

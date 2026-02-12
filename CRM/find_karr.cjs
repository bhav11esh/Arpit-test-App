
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function findKarr() {
    console.log('--- SEARCHING FOR "KARR" ---');

    // 1. Search for 'Karr'
    const { data: karr, error: kError } = await supabase
        .from('dealerships')
        .select('*')
        .ilike('name', '%Karr%');

    console.log('Dealerships matching "%Karr%":', karr);

    // 2. Search for 'Skoda' again to see all options
    const { data: skoda, error: sError } = await supabase
        .from('dealerships')
        .select('*')
        .ilike('name', '%Skoda%');

    console.log('Dealerships matching "%Skoda%":', skoda);
}

findKarr();

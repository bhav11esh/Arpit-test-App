require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDates() {
    console.log('Checking for specific dates in DB...');

    // Apple Auto Volkswagen code is likely APPLE_AUTO_VOLKSWAGEN or derived from name
    // We'll search by cluster_code or just list all deliveries for the showroom

    // First, find the showroom code for Apple Auto Volkswagen
    const { data: dealerships, error: dError } = await supabase
        .from('dealerships')
        .select('name')
        .ilike('name', '%Apple Auto%Volkswagen%'); // Adjust if needed

    if (dError || !dealerships || dealerships.length === 0) {
        console.log("Could not find dealership 'Apple Auto Volkswagen'");
    } else {
        console.log("Found dealership:", dealerships[0].name);
    }

    // Codes to check
    // 13-08 2025 -> 2025-08-13
    // 04-08-25 -> 2025-08-04

    const targetDates = ['2025-08-13', '2025-08-04'];

    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('*')
        .in('date', targetDates)
        .ilike('delivery_name', '%Apple%'); // Filter optionally strictly if needed, but date + name part is good

    if (error) {
        console.error('Error fetching deliveries:', error);
        return;
    }

    console.log(`Found ${deliveries.length} matches for dates: ${targetDates.join(', ')}`);
    deliveries.forEach(d => {
        console.log(`[FOUND] ID: ${d.id} | Date: ${d.date} | Name: ${d.delivery_name} | Showroom: ${d.showroom_code}`);
    });

    // Also get total count for this showroom
    const { count, error: countError } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .ilike('delivery_name', '%Apple%'); // Approximate filter for Apple Auto rows

    console.log(`\nTotal 'Apple' deliveries in DB: ${count}`);
}

checkDates();

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetAkshayaData() {
    console.log('--- Resetting data for AKSHAYA MERCEDES ---');

    // 1. Find the dealership ID to verify
    const { data: dealerships, error: dError } = await supabase
        .from('dealerships')
        .select('id, name')
        .ilike('name', '%Akshaya%Mercedes%');

    if (dError) {
        console.error('Error finding dealership:', dError);
        return;
    }

    if (!dealerships || dealerships.length === 0) {
        console.log('Could not find dealership "Akshaya Mercedes".');
        return;
    }

    const dealership = dealerships[0];
    console.log(`Found dealership: ${dealership.name} (${dealership.id})`);

    // 2. Count Deliveries to be deleted
    // Match by delivery_name pattern

    const { count, error: countError } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .ilike('delivery_name', '%Akshaya%');

    if (countError) {
        console.error('Error counting rows:', countError);
        return;
    }

    console.log(`Found ${count} records to delete.`);

    if (count > 0) {
        const { error: delError } = await supabase
            .from('deliveries')
            .delete()
            .ilike('delivery_name', '%Akshaya%');

        if (delError) {
            console.error('Error deleting rows:', delError);
        } else {
            console.log(`Successfully deleted records for Akshaya Mercedes.`);
        }
    } else {
        console.log('Nothing to delete.');
    }
}

resetAkshayaData();

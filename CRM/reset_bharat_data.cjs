require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetBharatData() {
    console.log('--- Resetting data for BHARAT TOYOTA ---');

    // 1. Find the dealership ID to verify
    const { data: dealerships, error: dError } = await supabase
        .from('dealerships')
        .select('id, name')
        .ilike('name', '%Bharat%Toyota%');

    if (dError) {
        console.error('Error finding dealership:', dError);
        return;
    }

    if (!dealerships || dealerships.length === 0) {
        console.log('Could not find dealership "Bharat Toyota".');
        return;
    }

    const dealership = dealerships[0];
    console.log(`Found dealership: ${dealership.name} (${dealership.id})`);

    // 2. Delete deliveries
    // Best to delete by delivery_name pattern AND showroom_code/dealership if possible
    // Since delivery_name always includes the dealership name logic, we can use ilike.
    // Delivery name format: DATE_DEALERSHIPNAME_...

    const searchPattern = `%Bharat%Toyota%`; // Safer to match name used in delivery_name logic
    // Or just delivery_name ilike '%BHARAT%' and showroom_code matching potentially?

    // Let's first count how many we are about to delete
    const { count, error: countError } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .ilike('delivery_name', '%Bharat%'); // Trying broader match

    if (countError) {
        console.error('Error counting rows:', countError);
        return;
    }

    console.log(`Found ${count} records to delete.`);

    if (count > 0) {
        const { error: delError } = await supabase
            .from('deliveries')
            .delete()
            .ilike('delivery_name', '%Bharat%');

        if (delError) {
            console.error('Error deleting rows:', delError);
        } else {
            console.log(`Successfully deleted records for Bharat Toyota.`);
        }
    } else {
        console.log('Nothing to delete.');
    }
}

resetBharatData();

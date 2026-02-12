const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function resetShowroomData() {
    const TARGET_CODE = 'APPLE_AUTO_VOLKSWAGEN';
    console.log(`--- resetting data for ${TARGET_CODE} ---`);

    // 1. Count records
    const { count, error: countError } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('showroom_code', TARGET_CODE);

    if (countError) {
        console.error('Error counting:', countError);
        return;
    }

    console.log(`Found ${count} records to delete.`);

    if (count === 0) {
        console.log('Nothing to delete.');
        return;
    }

    // 2. Delete
    // Note: We use the service role key, so RLS is bypassed.
    const { error: deleteError } = await supabase
        .from('deliveries')
        .delete()
        .eq('showroom_code', TARGET_CODE);

    if (deleteError) {
        console.error('Delete failed:', deleteError);
    } else {
        console.log(`✅ Successfully deleted records for ${TARGET_CODE}`);
    }
}

resetShowroomData();

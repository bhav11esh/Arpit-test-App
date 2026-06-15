import { adminSupabase } from './src/app/lib/supabase';

async function checkTable() {
    console.log('Checking live_bookings table...');
    if (!adminSupabase) {
        console.error('Admin Supabase client not initialized (missing service role key).');
        return;
    }

    try {
        const { data, error } = await adminSupabase
            .from('live_bookings')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error querying live_bookings:', error);
        } else {
            console.log('Success! Table exists. Data:', data);
        }

        // Also check with space just in case
        const { data: dataSpace, error: errorSpace } = await adminSupabase
            .from('live bookings')
            .select('*')
            .limit(1);

        if (errorSpace) {
            console.log('Query with space failed (as expected if underscore is correct):', errorSpace.message);
        } else {
            console.log('WHOA! Table exists WITH SPACE. Data:', dataSpace);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkTable();

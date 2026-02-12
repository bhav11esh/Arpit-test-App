const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './CRM/.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBooking() {
    const requestId = 'MPC_100220261730_T004';
    console.log(`Checking booking data for: ${requestId}`);

    const { data, error } = await supabase
        .from('live_bookings')
        .select('*')
        .eq('request_id', requestId);

    if (error) {
        console.error('Error fetching booking:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Booking found:', JSON.stringify(data[0], null, 2));
    } else {
        console.log('No booking found with that Request ID.');
    }
}

checkBooking();

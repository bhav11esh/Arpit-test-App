const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './CRM/.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listRecentBookings() {
    console.log('Fetching last 10 bookings...');

    const { data, error } = await supabase
        .from('live_bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching bookings:', error);
        return;
    }

    if (data && data.length > 0) {
        data.forEach(b => {
            console.log(`[${b.status}] ID: "${b.request_id}" | Created: ${b.created_at} | Venue: ${b.venue_name}`);
        });
    } else {
        console.log('No bookings found.');
    }
}

listRecentBookings();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Try loading from parent directory as well, since apps are structured in a monorepo-like fashion
dotenv.config({ path: '../.env.local' });
// Also try current directory just in case
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBooking() {
    const requestId = 'MPC_170220262359_T054';
    console.log(`Checking status for: ${requestId}`);

    const { data, error } = await supabase
        .from('live_bookings')
        .select('*')
        .eq('request_id', requestId)
        .single();

    if (error) {
        console.error('Error fetching booking:', error);
    } else {
        console.log('Booking Data:', JSON.stringify(data, null, 2));
    }
}

checkBooking();

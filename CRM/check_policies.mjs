import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Checking POLICIES on live_bookings...');

const { data, error } = await supabase
    .rpc('get_policies', { table_name: 'live_bookings' });

if (error) {
    console.log('RPC failed, trying raw query on pg_policies...');
    const { data: data2, error: error2 } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'live_bookings');

    if (error2) {
        console.error('Error fetching policies:', error2);
    } else {
        console.log('Policies found:', JSON.stringify(data2, null, 2));
    }
} else {
    console.log('Policies from RPC:', JSON.stringify(data, null, 2));
}

process.exit(0);

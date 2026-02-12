import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTQyNTIsImV4cCI6MjA4NTAzMDI1Mn0.OOzU01pM2q71k_vpCK7pfXBNiDnhDalg6q2cFr-lgBQ';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Querying all rows in live_bookings...');

const { data, error } = await supabase
    .from('live_bookings')
    .select('*');

if (error) {
    console.error('Error:', error);
} else {
    console.log('Row count:', data?.length);
    if (data) {
        data.forEach(b => {
            console.log(`- Request ID: "${b.request_id}", Status: ${b.status}, Venue: ${b.venue_name}`);
        });
    }
}

process.exit(0);

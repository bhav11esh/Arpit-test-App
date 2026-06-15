import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTQyNTIsImV4cCI6MjA4NTAzMDI1Mn0.OOzU01pM2q71k_vpCK7pfXBNiDnhDalg6q2cFr-lgBQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listRecentBookings() {
    const { data, error } = await supabase
        .from('live_bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error(error);
    } else {
        data.forEach(b => {
            console.log(`[${b.status}] ID: "${b.request_id}" | Created: ${b.created_at}`);
        });
    }
}

listRecentBookings();

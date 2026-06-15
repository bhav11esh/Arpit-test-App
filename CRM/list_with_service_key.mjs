import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Querying ALL entries using SERVICE_ROLE_KEY...');

const { data, error } = await supabase
    .from('live_bookings')
    .select('*')
    .order('created_at', { ascending: false });

if (error) {
    console.error('Error:', error);
} else {
    console.log('Total Rows:', data?.length);
    if (data) {
        data.forEach(b => {
            console.log(`[${b.status}] ID: "${b.request_id}", Hardcopy: "${b.hardcopy_filenames}"`);
        });
    }
}

process.exit(0);

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(supabaseUrl, supabaseKey);

const requestId = 'MPC_100220261742_T004';
console.log(`Force updating status for: ${requestId}`);

const { data, error } = await supabase
    .from('live_bookings')
    .update({
        status: 'PAID',
        hardcopy_filenames: 'TEST_FILE_123'
    })
    .eq('request_id', requestId)
    .select();

if (error) {
    console.error('Update failed:', error);
} else {
    console.log('Update success:', JSON.stringify(data, null, 2));
}

process.exit(0);

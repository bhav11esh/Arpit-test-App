
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZES6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('RESCUING KHIVRAJ AND PPS MAHINDRA...');

    const { error } = await supabase
        .from('deliveries')
        .update({
            status: 'UNASSIGNED',
            assigned_user_id: null,
            rejected_by_all: false,
            rejected_by_all_timestamp: null,
            updated_at: new Date().toISOString()
        })
        .eq('date', '2026-02-05')
        .or('showroom_code.eq.KHIVRAJ_TRIUMPH,showroom_code.eq.PPS_MAHINDRA');

    if (error) {
        console.error('Error rescuing:', error);
    } else {
        console.log('Rescue successful. Deliveries set to UNASSIGNED.');
    }
}
run();

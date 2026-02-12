
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

// THE TARGET ID FROM THE BROWSER SCREENSHOT
const browserId = 'bc268775-f79f-440b-bea4ba1dc762';
const dbId = 'bc268775-f79f-4400-b10b-bea4ba1dc762';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`FORCING DB SYNC TO BROWSER ID: ${browserId}`);

    // Update users table
    const { error: e1 } = await supabase.from('users').update({ id: browserId }).eq('id', dbId);
    console.log('Users update:', e1 || 'OK');

    // Update mappings table
    const { error: e2 } = await supabase.from('mappings').update({ photographer_id: browserId }).eq('photographer_id', dbId);
    console.log('Mappings update:', e2 || 'OK');

    // Update deliveries table (assigned_user_id)
    const { error: e3 } = await supabase.from('deliveries').update({ assigned_user_id: browserId }).eq('assigned_user_id', dbId);
    console.log('Deliveries update:', e3 || 'OK');

    // Update log_events table
    const { error: e4 } = await supabase.from('log_events').update({ actor_user_id: browserId }).eq('actor_user_id', dbId);
    console.log('Logs update:', e4 || 'OK');

    // RESCUE: Set all today's Khivraj and PPS Mahindra deliveries to UNASSIGNED so they show up for the cluster
    // This removes the "REJECTED" state that was hiding them
    const { error: e5 } = await supabase.from('deliveries').update({
        status: 'UNASSIGNED',
        assigned_user_id: null,
        rejected_by_all: false,
        rejected_by_all_timestamp: null
    })
        .eq('date', '2026-02-05')
        .or('showroom_code.eq.KHIVRAJ_TRIUMPH,showroom_code.eq.PPS_MAHINDRA');
    console.log('Rescue update:', e5 || 'OK');

    console.log('Done');
}
run();


const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const clusterCode = 'Whitefield-Indiranagar';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`🛠️ Fixing Cluster and Rescuing Deliveries...`);

    // 1. Update cluster_code for the user email (covers all records with that email)
    const { error: e1 } = await supabase.from('users').update({ cluster_code: clusterCode }).ilike('email', 'pavanmanne735@gmail.com');
    console.log(' - User Cluster Sync:', e1 || 'OK');

    // 2. Rescue Today's Deliveries
    console.log('🚁 Rescuing Khivraj & PPS Mahindra for 2026-02-05...');
    const { error: e2 } = await supabase.from('deliveries').update({
        status: 'UNASSIGNED',
        assigned_user_id: null,
        rejected_by_all: false,
        rejected_by_all_timestamp: null,
        updated_at: new Date().toISOString()
    })
        .eq('date', '2026-02-05')
        .or('showroom_code.eq.KHIVRAJ_TRIUMPH,showroom_code.eq.PPS_MAHINDRA');
    console.log(' - Rescue:', e2 || 'OK');

    console.log('📊 Fix finished.');
}
run();

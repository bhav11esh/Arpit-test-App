
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const oldId = 'bc268775-f79f-4400-b10b-bea4ba1dc762';
const newId = 'bc268775-f79f-440b-b10b-bea4ba1dc762'; // FIXED: added -b10b- segment
const clusterCode = 'Whitefield-Indiranagar';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`🚀 Starting Migration (V2): ${oldId} -> ${newId}`);

    // 1. Ensure cluster_code is set on OLD record first just in case
    await supabase.from('users').update({ cluster_code: clusterCode }).eq('id', oldId);

    // 2. Check if newId exists
    const { data: existingNew } = await supabase.from('users').select('*').eq('id', newId).single();

    if (existingNew) {
        console.log('✅ New ID record already exists in users table.');
    } else {
        // Create new user record
        const { data: oldUser } = await supabase.from('users').select('*').eq('id', oldId).single();
        if (oldUser) {
            const newUser = { ...oldUser, id: newId, cluster_code: clusterCode };
            const { error: insErr } = await supabase.from('users').insert(newUser);
            if (insErr) console.error('❌ Error creating new user record:', insErr);
            else console.log('✅ Created new user record with corect ID and cluster.');
        } else {
            console.error('❌ Could not find old user record.');
        }
    }

    // 3. Update all Foreign Keys
    console.log('🔗 Updating Foreign Keys...');

    const { error: e1 } = await supabase.from('mappings').update({ photographer_id: newId }).eq('photographer_id', oldId);
    console.log(' - Mappings:', e1 || 'OK');

    const { error: e2 } = await supabase.from('deliveries').update({ assigned_user_id: newId }).eq('assigned_user_id', oldId);
    console.log(' - Deliveries:', e2 || 'OK');

    const { error: e3 } = await supabase.from('log_events').update({ actor_user_id: newId }).eq('actor_user_id', oldId);
    console.log(' - Log Events:', e3 || 'OK');

    // 4. Rescue Today's Deliveries
    console.log('🚁 Rescuing Khivraj & PPS Mahindra for 2026-02-05...');
    const { error: e4 } = await supabase.from('deliveries').update({
        status: 'UNASSIGNED',
        assigned_user_id: null,
        rejected_by_all: false,
        rejected_by_all_timestamp: null,
        updated_at: new Date().toISOString()
    })
        .eq('date', '2026-02-05')
        .or('showroom_code.eq.KHIVRAJ_TRIUMPH,showroom_code.eq.PPS_MAHINDRA');
    console.log(' - Rescue:', e4 || 'OK');

    // 5. Final Cluster Sync
    await supabase.from('users').update({ cluster_code: clusterCode }).eq('id', newId);

    console.log('📊 Migration V2 finished.');
}
run();

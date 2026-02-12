
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const oldId = 'bc268775-f79f-4400-b10b-bea4ba1dc762';
const newId = 'bc268775-f79f-440b-bea4ba1dc762';
const clusterCode = 'Whitefield-Indiranagar';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`🚀 Starting Migration: ${oldId} -> ${newId}`);

    // 1. Check if newId exists already (maybe it was created by a previous attempt or partial sync)
    const { data: existingNew } = await supabase.from('users').select('*').eq('id', newId).single();

    if (existingNew) {
        console.log('✅ New ID record already exists in users table.');
    } else {
        // Create new user record by copying old one
        const { data: oldUser } = await supabase.from('users').select('*').eq('id', oldId).single();
        if (oldUser) {
            const newUser = { ...oldUser, id: newId, cluster_code: clusterCode };
            const { error: insErr } = await supabase.from('users').insert(newUser);
            if (insErr) console.error('❌ Error creating new user record:', insErr);
            else console.log('✅ Created new user record with correct ID and cluster.');
        } else {
            console.error('❌ Could not find old user record.');
        }
    }

    // 2. Update all Foreign Keys to point to newId
    console.log('🔗 Updating Foreign Keys...');

    const { error: e1 } = await supabase.from('mappings').update({ photographer_id: newId }).eq('photographer_id', oldId);
    console.log(' - Mappings:', e1 || 'OK');

    const { error: e2 } = await supabase.from('deliveries').update({ assigned_user_id: newId }).eq('assigned_user_id', oldId);
    console.log(' - Deliveries:', e2 || 'OK');

    const { error: e3 } = await supabase.from('log_events').update({ actor_user_id: newId }).eq('actor_user_id', oldId);
    console.log(' - Log Events:', e3 || 'OK');

    // 3. Rescue Today's Deliveries
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

    // 4. Update the user record to ensure cluster_code is set even if record was existing
    const { error: clusterErr } = await supabase.from('users').update({ cluster_code: clusterCode }).eq('id', newId);
    console.log(' - User Cluster Sync:', clusterErr || 'OK');

    console.log('📊 Migration finished.');
}
run();

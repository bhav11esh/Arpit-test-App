
const { createClient } = require('@supabase/supabase-js');

const urlFromEnv = 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function restoreKanakapuraPrimary() {
    console.log('--- RESTORING KANAKAPURA PRIMARY ---');

    // 1. Get Kanakapura Cluster
    const { data: cluster } = await supabase.from('clusters').select('id, name').ilike('name', '%Kanakapura%').single();
    if (!cluster) { console.log('Cluster not found'); return; }

    // 2. Find Inchara
    const { data: inchara } = await supabase.from('users').select('id, name').ilike('name', '%Inchara%').single();
    if (!inchara) { console.log('User Inchara not found'); return; }
    console.log(`Found Photographer: ${inchara.name} (${inchara.id})`);

    // 3. Find PPS Mahindra (Kanakapura) dealership
    const { data: dealer } = await supabase.from('dealerships').select('id, name').ilike('name', 'PPS Mahindra (Kanakapura)').single();
    if (!dealer) { console.log('Dealership not found'); return; }

    // 4. Update the mapping to PRIMARY and assign to Inchara
    const { error } = await supabase
        .from('mappings')
        .update({
            dealership_id: dealer.id,
            mapping_type: 'PRIMARY',
            photographer_id: inchara.id
        })
        .eq('cluster_id', cluster.id)
        .eq('dealership_id', dealer.id);

    if (error) console.error('Error updating mapping:', error);
    else console.log(`✅ Assigned ${dealer.name} as PRIMARY to ${inchara.name}`);
}

restoreKanakapuraPrimary();

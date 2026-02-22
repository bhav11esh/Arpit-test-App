
const { createClient } = require('@supabase/supabase-js');

const urlFromEnv = 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function applyFinalAssignments() {
    console.log('--- APPLYING FINAL KANAKAPURA ASSIGNMENTS ---');

    // 1. Get Cluster
    const { data: cluster } = await supabase.from('clusters').select('id, name').ilike('name', '%Kanakapura%').single();
    if (!cluster) { console.log('Cluster not found'); return; }

    // 2. Find Users
    const { data: bhuvanesan } = await supabase.from('users').select('id, name').ilike('name', '%Bhuvanesan%').single();
    const { data: inchara } = await supabase.from('users').select('id, name').ilike('name', '%Inchara%').single();

    console.log(`Bhuvanesan: ${bhuvanesan?.id || 'Not Found'}`);
    console.log(`Inchara: ${inchara?.id || 'Not Found'}`);

    if (!bhuvanesan || !inchara) {
        console.log('Stopping: One or both users not found.');
        return;
    }

    // 3. Assign PPS Mahindra -> Bhuvanesan
    await assignMapping('PPS Mahindra', cluster.id, bhuvanesan.id, 'PRIMARY', 'Bhuvanesan');

    // 4. Assign Pavan Hyundai -> Inchara
    await assignMapping('Pavan Hyundai', cluster.id, inchara.id, 'PRIMARY', 'Inchara');

    // 5. Cleanup my mistake (if Inchara was assigned to PPS, this overwrites it).
    // But wait, if Pavan Hyundai mapping doesn't exist, create it?
    // Let's assume it exists, if not, create generic dealership and mapping?
    // User said "mapping of pavan hyundai dealership", implying it exists.
}

async function assignMapping(dealerNamePartial, clusterId, userId, type, userName) {
    // Find Dealership
    const { data: dealer } = await supabase.from('dealerships').select('id, name').ilike('name', `%${dealerNamePartial}%`).single();
    if (!dealer) {
        console.log(`❌ Dealership '${dealerNamePartial}' not found.`);
        return;
    }

    // Check if mapping exists
    const { data: existing } = await supabase
        .from('mappings')
        .select('id')
        .eq('dealership_id', dealer.id)
        .eq('cluster_id', clusterId)
        .maybeSingle();

    if (existing) {
        // Update
        const { error } = await supabase
            .from('mappings')
            .update({ mapping_type: type, photographer_id: userId })
            .eq('id', existing.id);
        if (error) console.error('Error updating:', error);
        else console.log(`✅ Updated ${dealer.name} -> ${userName} (${type})`);
    } else {
        // Insert
        // Location? defaulting to 0,0 or dealer loc
        const { error } = await supabase.from('mappings').insert({
            cluster_id: clusterId,
            dealership_id: dealer.id,
            mapping_type: type,
            photographer_id: userId,
            latitude: 12.8812, // Default/Approx
            longitude: 77.5465
        });
        if (error) console.error('Error creating:', error);
        else console.log(`✅ Created ${dealer.name} -> ${userName} (${type})`);
    }
}

applyFinalAssignments();

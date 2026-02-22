
const { createClient } = require('@supabase/supabase-js');

const urlFromEnv = 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function consolidatePPS() {
    console.log('--- CONSOLIDATING PPS MAHINDRA ---');

    // 1. Find or Create the SINGLE "PPS Mahindra" dealership
    let { data: mainDealer, error: findError } = await supabase
        .from('dealerships')
        .select('*')
        .eq('name', 'PPS Mahindra') // Exact match
        .maybeSingle();

    if (!mainDealer) {
        console.log('Creating generic "PPS Mahindra" dealership...');
        // Use one of the others as template or default
        const { data: d, error: insertError } = await supabase.from('dealerships').insert({
            name: 'PPS Mahindra',
            latitude: 0, // Generic dealer doesn't need specific location if mappings have it? Or use HQ?
            longitude: 0,
            payment_type: 'UPI' // Default
        }).select().single();

        if (insertError) { console.error(insertError); return; }
        mainDealer = d;
    }
    console.log(`Using Main Dealership: ${mainDealer.name} (${mainDealer.id})`);

    // 2. Find all "Branch" dealerships
    const { data: branches } = await supabase
        .from('dealerships')
        .select('id, name')
        .ilike('name', 'PPS Mahindra%')
        .neq('id', mainDealer.id); // Exclude the main one

    if (branches.length === 0) {
        console.log('No branches to merge.');
        return;
    }

    console.log('Merging branches:', branches.map(b => b.name));

    // 3. Move Mappings to Main Dealership
    const branchIds = branches.map(b => b.id);
    const { error: updateError } = await supabase
        .from('mappings')
        .update({ dealership_id: mainDealer.id })
        .in('dealership_id', branchIds);

    if (updateError) {
        console.error('Error migrating mappings:', updateError);
        return;
    }
    console.log('✅ All mappings moved to PPS Mahindra.');

    // 4. Update Mappings Details (Specific Photographers/Types per Cluster)
    // Nelamangala -> PRIMARY (Venkatesh)
    // Kanakapura -> PRIMARY (Inchara)
    // Whitefield -> SECONDARY (Sahith/Shared)

    await updateMappingDetails(mainDealer.id, 'Nelamangala', 'Venkatesh', 'PRIMARY');
    await updateMappingDetails(mainDealer.id, 'Kanakapura', 'Inchara', 'PRIMARY');
    await updateMappingDetails(mainDealer.id, 'Whitefield', 'Sahith', 'SECONDARY'); // Or keep as is

    // 5. Delete Branch Dealerships
    const { error: deleteError } = await supabase
        .from('dealerships')
        .delete()
        .in('id', branchIds);

    if (deleteError) {
        console.error('Error deleting branches:', deleteError);
    } else {
        console.log('✅ Branch dealerships deleted.');
    }
}

async function updateMappingDetails(dealerId, clusterPartial, userNamePartial, type) {
    // Find Cluster
    const { data: cluster } = await supabase.from('clusters').select('id').ilike('name', `%${clusterPartial}%`).single();
    if (!cluster) return;

    // Find User
    const { data: user } = await supabase.from('users').select('id').ilike('name', `%${userNamePartial}%`).single();

    const updatePayload = { mapping_type: type };
    if (user) updatePayload.photographer_id = user.id;

    const { error } = await supabase
        .from('mappings')
        .update(updatePayload)
        .eq('dealership_id', dealerId)
        .eq('cluster_id', cluster.id);

    if (error) console.error(`Error updating ${clusterPartial}:`, error);
    else console.log(`Configured ${clusterPartial}: ${type} (${user ? userNamePartial : 'No User'})`);
}

consolidatePPS();

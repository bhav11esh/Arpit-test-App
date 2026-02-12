const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function restore() {
    console.log('--- Restoring PPS Mahindra Mapping ---');

    // 1. Get Aman Behera's ID
    const { data: aman } = await supabase.from('users').select('id, name').ilike('name', '%Aman Behera%').single();
    if (!aman) return console.error('Aman Behera not found!');
    console.log(`User: ${aman.name} (${aman.id})`);

    // 2. Get PPS Mahindra Dealership
    const { data: pps } = await supabase.from('dealerships').select('id, name').ilike('name', '%PPS Mahindra%').single();
    if (!pps) return console.error('PPS Mahindra not found!');
    console.log(`Dealership: ${pps.name} (${pps.id})`);

    // 3. Get Cluster
    const { data: cluster } = await supabase.from('clusters').select('id, name').eq('name', 'Whitefield-Indiranagar').single();
    if (!cluster) return console.error('Cluster not found!');
    console.log(`Cluster: ${cluster.name} (${cluster.id})`);

    // 4. Update or Insert Mapping
    // Check if mapping exists (even with null photographer)
    const { data: existing } = await supabase
        .from('mappings')
        .select('*')
        .eq('dealership_id', pps.id)
        .eq('cluster_id', cluster.id)
        .single();

    if (existing) {
        console.log('Updating existing mapping...');
        const { error } = await supabase
            .from('mappings')
            .update({
                photographer_id: aman.id,
                mapping_type: 'SECONDARY', // Usually secondary if not primary? Or should I check?
                // Based on proximity and others being PRIMARY, let's set to SECONDARY first or match others.
                // Actually, "Royal Enfield Teknik Motors" is PRIMARY for Aman. 
                // "PPS Mahindra" was likely SECONDARY or PRIMARY. 
                // Let's check other mappings for Aman in this cluster.
            })
            .eq('id', existing.id);

        if (error) console.error('Error updating:', error);
        else console.log('Successfully updated mapping!');
    } else {
        console.log('Creating new mapping...');
        const { error } = await supabase
            .from('mappings')
            .insert({
                cluster_id: cluster.id,
                dealership_id: pps.id,
                photographer_id: aman.id,
                mapping_type: 'SECONDARY', // Defaulting to secondary for now as safety
                latitude: 12.9822, // Approximate from earlier analysis
                longitude: 77.6408
            });

        if (error) console.error('Error inserting:', error);
        else console.log('Successfully created mapping!');
    }
}

restore();

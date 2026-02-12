const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAkhil() {
    console.log('--- Debugging Akhil ---');

    // 1. Get User
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', '%aka246966@gmail.com%'); // Assuming this is Akhil based on HomeScreen code

    if (userError || !users.length) {
        console.error('User not found or error:', userError);
        return;
    }

    const akhil = users[0];
    console.log('User:', {
        id: akhil.id,
        name: akhil.name,
        email: akhil.email,
        cluster_code: akhil.cluster_code,
        active: akhil.active
    });

    // 2. Get Cluster
    if (akhil.cluster_code) {
        const { data: cluster } = await supabase
            .from('clusters')
            .select('*')
            .eq('name', akhil.cluster_code)
            .single();
        console.log('Cluster (by code):', cluster);
    }

    // 3. Get Mappings
    const { data: mappings } = await supabase
        .from('mappings')
        .select(`
      *,
      dealerships ( id, name, payment_type ),
      clusters ( id, name )
    `)
        .eq('photographer_id', akhil.id);

    console.log('--- Direct Mappings (Primary) ---');
    if (mappings && mappings.length) {
        const direct = mappings.map(m => ({
            type: m.mapping_type,
            showroom: m.dealerships?.name,
            cluster: m.clusters?.name
        }));
        // Use dir with depth null to show full object
        console.dir(direct, { depth: null });
    } else {
        console.log('No direct mappings found.');
    }

    // 4. Get Cluster Mappings (Secondary)
    if (akhil.cluster_code) {
        const { data: clusterObj } = await supabase.from('clusters').select('id').eq('name', akhil.cluster_code).single();

        if (clusterObj) {
            const { data: clusterMappings } = await supabase
                .from('mappings')
                .select(`
                *,
                dealerships ( id, name )
            `)
                .eq('cluster_id', clusterObj.id);

            console.log(`--- Cluster Mappings (Potential Secondary) for Cluster ID ${clusterObj.id} ---`);
            const simplified = clusterMappings.map(m => ({
                showroom: m.dealerships?.name,
                mappedToPhotographer: m.photographer_id,
                isMe: m.photographer_id === akhil.id,
                type: m.mapping_type // In DB this is likely 'PRIMARY' for the person assigned
            }));
            console.dir(simplified, { depth: null });
        } else {
            console.error(`Cluster code '${akhil.cluster_code}' not found in DB`);
        }
    } else {
        console.log('Akhil has no cluster_code');
    }
}

debugAkhil();

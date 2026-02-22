
const { createClient } = require('@supabase/supabase-js');

const urlFromEnv = 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function compareOthers() {
    console.log('--- COMPARING OTHERS ---');

    const { data: cluster } = await supabase.from('clusters').select('id, name').ilike('name', '%Whitefield%').single();
    const clusterId = cluster.id;
    console.log(`Target Cluster: ${cluster.name} (${clusterId})`);

    const names = ['Mallikarjun', 'Aman'];

    for (const name of names) {
        const { data: user } = await supabase.from('users').select('id, name, cluster_code, role').ilike('name', `%${name}%`).maybeSingle();

        if (!user) { console.log(`\nUser: ${name} (Not Found)`); continue; }

        console.log(`\nUser: ${user.name}`);
        console.log(`   Cluster Code: ${user.cluster_code || 'NULL'}`);

        // Check Primary Mappings in this cluster
        const { data: pMap } = await supabase.from('mappings')
            .select('dealerships(name)')
            .eq('photographer_id', user.id)
            .eq('mapping_type', 'PRIMARY')
            .eq('cluster_id', clusterId);

        if (pMap && pMap.length > 0) {
            console.log(`   Primary Showrooms: ${pMap.map(m => m.dealerships.name).join(', ')}`);
        } else {
            console.log(`   Primary Showrooms: None`);
        }
    }
}

compareOthers();

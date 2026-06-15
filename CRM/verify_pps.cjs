
const { createClient } = require('@supabase/supabase-js');

const urlFromEnv = 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function verifyPPS() {
    console.log('--- VERIFYING PPS DEALERSHIPS ---');

    const { data: dealerships } = await supabase.from('dealerships').select('*').ilike('name', '%PPS Mahindra%');

    console.log('Found Dealerships:');
    dealerships.forEach(d => {
        console.log(`- [${d.id}] ${d.name} (Lat: ${d.latitude}, Lng: ${d.longitude})`);
    });

    console.log('\n--- VERIFYING PPS MAPPINGS ---');
    const { data: mappings } = await supabase
        .from('mappings')
        .select('id, mapping_type, cluster:clusters(name), dealership:dealerships(name), photographer:users(name)')
        .ilike('dealerships.name', '%PPS Mahindra%');

    // Client-side filter because Supabase join filtering is tricky with nested result
    const ppsMappings = await supabase
        .from('mappings')
        .select('id, mapping_type, cluster_id, dealership_id, photographer_id')

    // Let's iterate found dealerships and check their mappings
    for (const d of dealerships) {
        console.log(`\nMappings for ${d.name}:`);
        const { data: maps } = await supabase
            .from('mappings')
            .select(`
            id, 
            mapping_type, 
            cluster:clusters(name),
            photographer:users(name)
        `)
            .eq('dealership_id', d.id);

        if (maps.length === 0) console.log('   (No mappings)');
        maps.forEach(m => {
            const cName = m.cluster ? m.cluster.name : 'Unknown';
            const pName = m.photographer ? m.photographer.name : 'None';
            console.log(`   Cluster: ${cName} | Type: ${m.mapping_type} | Photog: ${pName}`);
        });
    }
}

verifyPPS();

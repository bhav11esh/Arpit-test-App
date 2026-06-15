
const { createClient } = require('@supabase/supabase-js');

const urlFromEnv = 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function verifyKanakapuraFinal() {
    console.log('--- VERIFYING KANAKAPURA FINAL STATE ---');

    // 1. Cluster
    const { data: cluster } = await supabase.from('clusters').select('id, name').ilike('name', '%Kanakapura%').single();
    const clusterId = cluster.id;
    console.log(`Cluster: ${cluster.name} (${clusterId})`);

    // 2. Users
    const { data: bhuvanesan } = await supabase.from('users').select('id, name, cluster_code').ilike('name', '%Bhuvanesan%').single();
    const { data: inchara } = await supabase.from('users').select('id, name, cluster_code').ilike('name', '%Inchara%').single();

    console.log(`\nUser: ${bhuvanesan.name} | Cluster: ${bhuvanesan.cluster_code} (${bhuvanesan.cluster_code === clusterId ? 'MATCH' : 'MISMATCH'})`);
    console.log(`User: ${inchara.name} | Cluster: ${inchara.cluster_code} (${inchara.cluster_code === clusterId ? 'MATCH' : 'MISMATCH'})`);

    // 3. Mappings
    const { data: mappings } = await supabase
        .from('mappings')
        .select(`
        mapping_type, 
        dealership:dealerships(name), 
        photographer:users(name)
    `)
        .eq('cluster_id', clusterId);

    console.log('\nMappings Configured:');
    mappings.forEach(m => {
        let status = '';
        if (m.mapping_type === 'PRIMARY') status = `(Assigned to ${m.photographer?.name})`;
        else status = '(Secondary)';
        console.log(` - ${m.dealership.name}: [${m.mapping_type}] ${status}`);
    });
}

verifyKanakapuraFinal();

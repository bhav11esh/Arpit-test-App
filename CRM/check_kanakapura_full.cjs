
const { createClient } = require('@supabase/supabase-js');

const urlFromEnv = 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function checkKanakapuraFull() {
    console.log('--- CHECKING KANAKAPURA FULL ---');

    // 1. Cluster
    const { data: cluster } = await supabase.from('clusters').select('id, name').ilike('name', '%Kanakapura%').single();
    console.log(`Cluster: ${cluster?.name} (${cluster?.id})`);
    if (!cluster) return;

    // 2. Inchara
    const { data: inchara } = await supabase.from('users').select('id, name, cluster_code').ilike('name', '%Inchara%').single();
    console.log(`\nUser: ${inchara?.name} (${inchara?.id})`);
    console.log(`   Assigned Cluster Code: ${inchara?.cluster_code}`);
    console.log(`   (Matches Kanakapura? ${inchara?.cluster_code === cluster.id ? 'YES' : 'NO'})`);

    // 3. Mappings in Kanakapura
    const { data: mappings } = await supabase
        .from('mappings')
        .select(`
        id, 
        mapping_type, 
        dealership:dealerships(name), 
        photographer:users(name)
    `)
        .eq('cluster_id', cluster.id);

    console.log('\nMappings in Cluster:');
    mappings.forEach(m => {
        console.log(` - ${m.dealership?.name}: ${m.mapping_type} (Photog: ${m.photographer?.name || 'None'})`);
    });

    // 4. Check Pavan Hyundai specifically (anywhere)
    const { data: pavan } = await supabase.from('dealerships').select('id, name').ilike('name', '%Pavan Hyundai%');
    console.log('\nPavan Hyundai Dealerships found:', pavan.length);
    pavan.forEach(p => console.log(` - ${p.name}`));
}

checkKanakapuraFull();

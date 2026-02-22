
const { createClient } = require('@supabase/supabase-js');

const urlFromEnv = 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function fixKanakapuraUsers() {
    console.log('--- FIXING KANAKAPURA USERS CLUSTER CODES ---');

    // 1. Get Kanakapura Cluster ID
    const { data: cluster } = await supabase.from('clusters').select('id, name').ilike('name', '%Kanakapura%').single();
    if (!cluster) { console.log('Cluster not found'); return; }
    console.log(`Target Cluster: ${cluster.name} (${cluster.id})`);

    // 2. Update Bhuvanesan
    await updateUserCluster('Bhuvanesan', cluster.id);

    // 3. Update Inchara
    await updateUserCluster('Inchara', cluster.id);
}

async function updateUserCluster(namePartial, clusterId) {
    const { data: user } = await supabase.from('users').select('id, name, cluster_code').ilike('name', `%${namePartial}%`).single();
    if (!user) {
        console.log(`User ${namePartial} not found.`);
        return;
    }

    if (user.cluster_code === clusterId) {
        console.log(`✅ ${user.name} is already in correct cluster.`);
        return;
    }

    const { error } = await supabase
        .from('users')
        .update({ cluster_code: clusterId })
        .eq('id', user.id);

    if (error) console.error(`Error updating ${user.name}:`, error);
    else console.log(`✅ Updated ${user.name} cluster_code to Kanakapura.`);
}

fixKanakapuraUsers();


const { createClient } = require('@supabase/supabase-js');

const urlFromEnv = 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function findKanakapuraGhost() {
    console.log('--- SEARCHING FOR KANAKAPURA PHOTOGRAPHER ---');

    // 1. Get Kanakapura Cluster ID
    const { data: cluster } = await supabase.from('clusters').select('id, name').ilike('name', '%Kanakapura%').single();
    if (!cluster) { console.log('Cluster not found'); return; }
    console.log(`Cluster: ${cluster.name} (${cluster.id})`);

    // 2. Search 'deliveries' table for any deliveries in this cluster
    // We want to see distinct user_id
    const { data: deliveries } = await supabase
        .from('deliveries')
        .select('user_id, users(name, email, role, cluster_code)')
        .eq('cluster_id', cluster.id)
        .not('user_id', 'is', null)
        .limit(20);

    if (deliveries && deliveries.length > 0) {
        console.log(`\nFound ${deliveries.length} past deliveries in this cluster.`);
        const uniqueUsers = new Set();

        deliveries.forEach(d => {
            if (d.users) {
                const label = `${d.users.name} (${d.users.email}) - ClusterCode: ${d.users.cluster_code}`;
                uniqueUsers.add(label);
            }
        });

        console.log('Photographers who worked here:');
        uniqueUsers.forEach(u => console.log(' - ' + u));
    } else {
        console.log('\nNo delivery history found for this cluster.');
    }

    // 3. Search for any user who might have "Kanakapura" in the name or email?
    const { data: fuzzyUsers } = await supabase.from('users').select('name, email, cluster_code').ilike('name', '%Kanakapura%');
    if (fuzzyUsers && fuzzyUsers.length > 0) {
        console.log('\nUsers with "Kanakapura" in name:');
        console.log(fuzzyUsers);
    }
}

findKanakapuraGhost();

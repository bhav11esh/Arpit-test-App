const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const fs = require('fs');

function log(msg) {
    console.log(msg);
    fs.appendFileSync('aman_status.txt', (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg) + '\n');
}

// Clear file
fs.writeFileSync('aman_status.txt', '');

async function debugAmanStatus() {
    log('--- 🔍 DEBUGGING AMAN STATUS ---');

    // 1. Find Aman
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('name', '%Aman%');

    if (userError || !users.length) {
        log('❌ Could not find user "Aman"');
        return;
    }

    const aman = users[0];
    log(`✅ Found User: ${aman.name} (${aman.email})`);
    log(`   ID: ${aman.id}`);
    log(`   Cluster: ${aman.cluster_code}`);

    // 2. Check Mappings
    log('\n--- 🗺️ MAPPINGS CHECK ---');
    const { data: mappings, error: mapError } = await supabase
        .from('mappings')
        .select('*'); // Get all to filter in memory to match client logic exactly if needed, or filter by ID

    if (mapError) {
        log('❌ Error fetching mappings: ' + JSON.stringify(mapError));
        return;
    }

    // Filter like HomeScreen.tsx
    // PRIMARY: m.photographerId === user.id
    const primaryMappings = mappings.filter(m => m.photographerId === aman.id && m.mappingType === 'PRIMARY');
    log(`\n📌 PRIMARY Mappings for Aman (${primaryMappings.length}):`);
    primaryMappings.forEach(m => log(`   - Dealership ID: ${m.dealershipId} (Cluster: ${m.clusterId})`));

    // SECONDARY: m.mappingType === 'SECONDARY' && (cluster match)
    // Client logic: matchesId = cluster?.id === effectiveClusterCode || matchesName = cluster?.name === effectiveClusterCode
    // We need to fetch clusters to verify names vs IDs
    const { data: clusters } = await supabase.from('clusters').select('*');

    // Resolve Aman's effective cluster (use his cluster_code)
    const effectiveClusterCode = aman.cluster_code;

    const secondaryMappings = mappings.filter(m => {
        if (m.mappingType !== 'SECONDARY') return false;

        const cluster = clusters.find(c => c.id === m.clusterId);
        if (!cluster) return false;

        const matchesId = cluster.id === effectiveClusterCode;
        const matchesName = cluster.name === effectiveClusterCode;

        return matchesId || matchesName;
    });

    log(`\n📌 SECONDARY Mappings for Aman's Cluster "${effectiveClusterCode}" (${secondaryMappings.length}):`);
    secondaryMappings.forEach(m => log(`   - Dealership ID: ${m.dealershipId} (Cluster: ${m.clusterId})`));

    const totalEligible = primaryMappings.length + secondaryMappings.length;
    log(`\n👉 TOTAL Eligible Showrooms for Timing Prompt: ${totalEligible}`);

    if (totalEligible === 0) {
        log('⚠️  WARNING: Aman has 0 eligible showrooms. Prompt loop will NEVER run.');
    }

    // 3. Check Global Finalization Logs
    log('\n--- 📜 GLOBAL FINALIZATION LOGS (Today) ---');
    // Assuming today is 2026-02-06 based on user prompt context
    const today = '2026-02-06';

    const { data: logs, error: logError } = await supabase
        .from('log_events')
        .select('*')
        .eq('type', 'SHOWROOM_FINALIZED')
        .gte('created_at', `${today}T00:00:00Z`)
        .lte('created_at', `${today}T23:59:59Z`);

    if (logError) {
        log('Error fetching logs: ' + JSON.stringify(logError));
    } else {
        log(`Found ${logs.length} SHOWROOM_FINALIZED events for ${today}:`);
        logs.forEach(l => {
            log(`   - Showroom: ${l.target_id} | By User: ${l.user_id} | At: ${l.created_at}`);
        });
    }

}

debugAmanStatus();

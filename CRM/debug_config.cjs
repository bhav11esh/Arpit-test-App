const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

function log(msg) {
    console.log(msg);
    fs.appendFileSync('config_dump.txt', (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg) + '\n');
}

// Clear file
fs.writeFileSync('config_dump.txt', '');

async function debugConfig() {
    log('--- 🗺️ CONFIG DUMP ---');

    // Clusters
    const { data: clusters, error: cError } = await supabase.from('clusters').select('*');
    if (cError) log('Error fetching clusters: ' + JSON.stringify(cError));
    else {
        log(`\n📌 CLUSTERS (${clusters.length}):`);
        clusters.forEach(c => log(`   - [${c.id}] ${c.name}`));
    }

    // Dealerships
    const { data: dealerships, error: dError } = await supabase.from('dealerships').select('*');
    if (dError) log('Error fetching dealerships: ' + JSON.stringify(dError));
    else {
        log(`\n📌 DEALERSHIPS (${dealerships.length}):`);
        dealerships.forEach(d => log(`   - [${d.id}] ${d.name} (${d.paymentType || d.payment_type})`));
    }

    // Mappings
    const { data: mappings, error: mError } = await supabase.from('mappings').select('*');
    if (mError) log('Error fetching mappings: ' + JSON.stringify(mError));
    else {
        log(`\n📌 ALL MAPPINGS (${mappings.length}):`);
        mappings.forEach(m => log(`   - P: ${m.photographer_id || 'NULL'} -> D: ${m.dealership_id} (Cl: ${m.cluster_id}) [${m.mapping_type}]`));
    }
}

debugConfig();

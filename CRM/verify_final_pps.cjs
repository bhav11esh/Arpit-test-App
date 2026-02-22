
const { createClient } = require('@supabase/supabase-js');

const urlFromEnv = 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function verifyFinalPPS() {
    console.log('--- VERIFYING FINAL PPS MAHINDRA SHOWROOMS ---');

    // 1. Get Main Dealership
    const { data: dealer } = await supabase.from('dealerships').select('*').eq('name', 'PPS Mahindra').single();
    if (!dealer) { console.log('Main Dealership not found!'); return; }
    console.log(`Main Dealership: ${dealer.name} (${dealer.id})`);
    console.log(`Base Location: Lat ${dealer.latitude}, Lng ${dealer.longitude}`);

    // 2. Get All Mappings for this Dealership
    const { data: mappings } = await supabase
        .from('mappings')
        .select(`
        id, 
        mapping_type, 
        latitude, 
        longitude,
        cluster:clusters(name),
        photographer:users(name) // Get photographer name
    `)
        .eq('dealership_id', dealer.id);

    if (!mappings || mappings.length === 0) {
        console.log('No mappings found for main dealership.');
        return;
    }

    console.log('\n--- Showrooms found ---');
    mappings.forEach(m => {
        const clusterName = m.cluster ? m.cluster.name : 'Unknown';
        const photogName = m.photographer ? m.photographer.name : 'None';

        console.log(`\nCluster: ${clusterName}`);
        console.log(`   Type: ${m.mapping_type}`);
        console.log(`   Photographer: ${photogName}`);
        console.log(`   Coordinates: Lat ${m.latitude}, Lng ${m.longitude}`);

        // Verification Logic
        if (m.latitude === 0 && m.longitude === 0) {
            console.warn('   ⚠️ WARNING: Location is 0,0!');
        } else if (!m.latitude || !m.longitude) {
            console.warn('   ⚠️ WARNING: Location is MISSING!');
        } else {
            console.log('   ✅ Location OK');
        }
    });
}

verifyFinalPPS();

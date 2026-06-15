
const { createClient } = require('@supabase/supabase-js');

const urlFromEnv = 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function fixFinalCoords() {
    console.log('--- ENSURING COORDS FOR PPS MAPPING ---');

    // 1. Get IDs
    const { data: clusterKan } = await supabase.from('clusters').select('id').ilike('name', '%Kanakapura%').single();
    const { data: clusterNel } = await supabase.from('clusters').select('id').ilike('name', '%Nelamangala%').single();
    const { data: clusterWhi } = await supabase.from('clusters').select('id').ilike('name', '%Whitefield%').single();

    const { data: dealer } = await supabase.from('dealerships').select('id').eq('name', 'PPS Mahindra').single();
    if (!dealer) { console.log('Dealer not found'); return; }

    // 2. Kanakapura (Lat 12.8812, Lng 77.5465)
    await updateCoords(dealer.id, clusterKan.id, 12.8812, 77.5465, 'Kanakapura');

    // 3. Whitefield (Lat 12.9866, Lng 77.7288) - From earlier step
    await updateCoords(dealer.id, clusterWhi.id, 12.9866, 77.7288, 'Whitefield');

    // 4. Nelamangala (Lat ~13.0953, Lng ~77.3964) - Need to be sure, or retain existing.
    // Let's check if it exists and has coords first.
    const { data: mapNel } = await supabase.from('mappings').select('*').eq('dealership_id', dealer.id).eq('cluster_id', clusterNel.id).single();
    if (mapNel) {
        if (!mapNel.latitude || mapNel.latitude === 0) {
            console.log('Nelamangala coords missing! Setting default PPS Nelamangala coords (13.0953, 77.3964)');
            await updateCoords(dealer.id, clusterNel.id, 13.0953, 77.3964, 'Nelamangala');
        } else {
            console.log(`Nelamangala Coords OK: ${mapNel.latitude}, ${mapNel.longitude}`);
        }
    } else {
        console.log('Nelamangala mapping not found?');
    }
}

async function updateCoords(dealershipId, clusterId, lat, lng, name) {
    const { error } = await supabase
        .from('mappings')
        .update({ latitude: lat, longitude: lng })
        .eq('dealership_id', dealershipId)
        .eq('cluster_id', clusterId);

    if (error) console.error(`Error updating ${name}:`, error);
    else console.log(`✅ Updated ${name} coordinates.`);
}

fixFinalCoords();

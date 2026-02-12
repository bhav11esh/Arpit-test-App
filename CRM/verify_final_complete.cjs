
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function verifyFinalComplete() {
    console.log('--- DEFINITIVE FINAL VERIFICATION (ALL 5) ---');

    console.log('\n[1] Pavan Hyundai:');
    const { count: pavan } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).ilike('delivery_name', '%Pavan%');
    console.log(`- Count: ${pavan}`);

    console.log('\n[2] Royal Enfield Teknik Motors:');
    // Find ID for Teknik Motors specifically if possible, or use pattern
    const { data: re } = await supabase.from('dealerships').select('id, name').ilike('name', '%Teknik%');
    if (re && re.length > 0) {
        for (const d of re) {
            const { count } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('showroom_code', d.id);
            console.log(`- ${d.name} (${d.id}): ${count}`);
        }
    } else {
        console.log("- No 'Teknik' dealership found.");
    }

    console.log('\n[3] Skoda Karr:');
    // ID from previous step: b3034732-d979-4c69-861e-84d3a32adfe4
    const karrId = 'b3034732-d979-4c69-861e-84d3a32adfe4';
    const { count: skoda } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('showroom_code', karrId);
    console.log(`- Count (ID: ...adfe4): ${skoda}`);

    console.log('\n[4] PPS Mahindra:');
    // ID: 11d27b2a-8d82-4b86-9ac5-b0ab77b02f2c
    // Name Pattern: %PPS_MAHINDRA%
    const { count: mahindraName } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).ilike('delivery_name', '%PPS_MAHINDRA%');
    console.log(`- Count by Name Pattern (%PPS_MAHINDRA%): ${mahindraName}`);

    console.log('\n[5] PPS Skoda:');
    // ID: 7e38ff33-3db5-4f10-85ee-798355973816
    const ppsSkodaId = '7e38ff33-3db5-4f10-85ee-798355973816';
    const { count: ppsSkodaCode } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('showroom_code', ppsSkodaId);
    console.log(`- Count by Showroom Code (${ppsSkodaId}): ${ppsSkodaCode}`);

    const { count: ppsSkodaName } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).ilike('delivery_name', '%PPS_SKODA%');
    console.log(`- Count by Name Pattern (%PPS_SKODA%): ${ppsSkodaName}`);

    const { count: ppsSkodaVar } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).ilike('delivery_name', '%SKODA_PPS%');
    console.log(`- Count by Variant (%SKODA_PPS%): ${ppsSkodaVar}`);
}

verifyFinalComplete();


const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function verifyFinalThree() {
    console.log('--- VERIFICATION FOR REQUESTED DEALERSHIPS ---');

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

    // Check using mappings to be robust
    const { data: skodaMappings } = await supabase.from('mappings').select('id').eq('dealership_id', karrId);
    const skodaCodes = skodaMappings && skodaMappings.length > 0 ? skodaMappings.map(m => m.id) : [karrId];

    const { count: skoda } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).in('showroom_code', skodaCodes);
    console.log(`- Count (ID: ...adfe4): ${skoda}`);

    // Check PPS Skoda just in case I polluted it
    const ppsId = '7e38ff33-3db5-4f10-85ee-798355973816';
    const { count: pps } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('showroom_code', ppsId);
    console.log(`\n(Reference) PPS Skoda Count: ${pps}`);
}

verifyFinalThree();

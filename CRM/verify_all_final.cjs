
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function verifyAllFinal() {
    console.log('--- DEFINITIVE FINAL VERIFICATION ---');

    console.log('\n[1] Pavan Hyundai Check:');
    const { count: pavan } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).ilike('delivery_name', '%Pavan%');
    console.log(`- Count by Name Pattern: ${pavan}`);

    console.log('\n[2] Royal Enfield Check:');
    const { count: re } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).ilike('delivery_name', '%ROYAL_ENFIELD%');
    console.log(`- Count by Name Pattern (%ROYAL_ENFIELD%): ${re}`);

    console.log('\n[3] Skoda Check:');
    // PPS Skoda (Karr) ID: 7e38ff33-3db5-4f10-85ee-798355973816 (from logs)
    const skodaId = '7e38ff33-3db5-4f10-85ee-798355973816';
    const { count: skodaCode } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('showroom_code', skodaId);
    console.log(`- Count by Showroom Code (${skodaId}): ${skodaCode}`);

    // Also check name pattern just in case
    const { count: skodaName } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).ilike('delivery_name', '%SKODA%');
    console.log(`- Count by Name Pattern (%SKODA%): ${skodaName}`);
}

verifyAllFinal();

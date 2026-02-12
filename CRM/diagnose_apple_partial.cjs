
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function diagnoseApplePartial() {
    console.log('--- DIAGNOSING PARTIAL IMPORT (APPLE AUTO) ---');

    const DEALERSHIP_ID = '4e2d6e16-bb54-4071-9e75-bf55d37d6684';
    const MAPPING_ID = '00fae552-c7c0-42cc-870f-b277ec92e533';

    // Check both IDs just in case
    const { count: countD } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('showroom_code', DEALERSHIP_ID);
    const { count: countM } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('showroom_code', MAPPING_ID);

    console.log(`Count by Dealership ID: ${countD}`);
    console.log(`Count by Mapping ID: ${countM}`);

    const targetId = countD > countM ? DEALERSHIP_ID : MAPPING_ID;

    const { data: records, error } = await supabase
        .from('deliveries')
        .select('date, delivery_name')
        .eq('showroom_code', targetId)
        .order('date', { ascending: true });

    if (error) { console.error('Supabase Error:', error); return; }

    console.log(`Found ${records?.length} records.`);

    if (!records || records.length === 0) {
        console.log("No records found.");
        return;
    }

    console.log(`First Record Date: ${records[0].date}`);
    console.log(`Last Record Date: ${records[records.length - 1].date}`);

    console.log('--- Last 20 Records ---');
    const last20 = records.slice(-20);
    last20.forEach((r, i) => console.log(`${records.length - 20 + i + 1}. ${r.date} | ${r.delivery_name}`));
}

diagnoseApplePartial();

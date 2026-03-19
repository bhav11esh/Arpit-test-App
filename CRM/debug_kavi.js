
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    const results = {};

    const { data: users } = await supabase.from('users').select('*').ilike('name', '%kavi%');
    results.kaviUsers = users;

    const { data: dealerships } = await supabase.from('dealerships').select('*').ilike('name', '%khivraj%');
    results.khivrajDealerships = dealerships;

    const dealershipIds = dealerships.map(d => d.id);
    const { data: mappings } = await supabase.from('mappings').select('*').in('dealership_id', dealershipIds);
    results.khivrajMappings = mappings;

    const kaviId = users?.[0]?.id;
    if (kaviId) {
        const { data: kaviMappings } = await supabase.from('mappings').select('*').eq('photographer_id', kaviId);
        results.kaviMappings = kaviMappings;
    }

    const { data: deliveries } = await supabase.from('deliveries').select('*').eq('date', '2026-02-25').ilike('showroom_code', '%khivraj%');
    results.todayKhivrajDeliveries = deliveries;

    const { data: allMappings } = await supabase.from('mappings').select('*');
    results.allMappingsForKaviCluster = allMappings.filter(m => {
        const kaviClusterIds = results.kaviMappings?.map(km => km.clusterId) || [];
        return kaviClusterIds.includes(m.clusterId);
    });

    fs.writeFileSync('kavi_debug_results.json', JSON.stringify(results, null, 2));
    console.log('Results written to kavi_debug_results.json');
}

check();

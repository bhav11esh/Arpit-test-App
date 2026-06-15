
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigration() {
    console.log('🔍 Verifying SQL Migration...');

    // 1. Check deliveries for deleted_at
    const { data: deliveryCols, error: deliveryErr } = await supabase
        .from('deliveries')
        .select('*')
        .limit(1);
    
    if (deliveryErr) {
        console.error('❌ Error checking deliveries:', deliveryErr.message);
    } else {
        const hasDeletedAt = deliveryCols && deliveryCols.length > 0 ? 'deleted_at' in deliveryCols[0] : 'Unknown (No data)';
        console.log(`- deliveries.deleted_at exists: ${hasDeletedAt}`);
    }

    // 2. Check users for city
    const { data: userCols, error: userErr } = await supabase
        .from('users')
        .select('*')
        .limit(1);
    
    if (userErr) {
        console.error('❌ Error checking users:', userErr.message);
    } else {
        const hasCity = userCols && userCols.length > 0 ? 'city' in userCols[0] : 'Unknown (No data)';
        console.log(`- users.city exists: ${hasCity}`);
    }

    // 3. Check clusters for city
    const { data: clusterCols, error: clusterErr } = await supabase
        .from('clusters')
        .select('*')
        .limit(1);
    
    if (clusterErr) {
        console.error('❌ Error checking clusters:', clusterErr.message);
    } else {
        const hasCity = clusterCols && clusterCols.length > 0 ? 'city' in clusterCols[0] : 'Unknown (No data)';
        console.log(`- clusters.city exists: ${hasCity}`);
    }

    // 4. Check dealerships for city
    const { data: dealershipCols, error: dealershipErr } = await supabase
        .from('dealerships')
        .select('*')
        .limit(1);
    
    if (dealershipErr) {
        console.error('❌ Error checking dealerships:', dealershipErr.message);
    } else {
        const hasCity = dealershipCols && dealershipCols.length > 0 ? 'city' in dealershipCols[0] : 'Unknown (No data)';
        console.log(`- dealerships.city exists: ${hasCity}`);
    }
}

verifyMigration();

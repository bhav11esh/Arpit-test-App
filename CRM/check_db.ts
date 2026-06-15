
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

async function checkDeliveries() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Checking deliveries for date: ${today}`);

    const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('date', today);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} deliveries total for today.`);
    data.forEach(d => {
        console.log(`[${d.id}] ${d.delivery_name} | Showroom: ${d.showroom_code} | Cluster: ${d.cluster_code} | Status: ${d.status} | Type: ${d.showroom_type}`);
    });
}

checkDeliveries();

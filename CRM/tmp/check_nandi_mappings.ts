
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey!);

async function checkMappings() {
    const nandiId = '92f642a5-563f-471e-a804-173fbadc71a3';
    
    console.log(`Checking mappings for Nandi Toyota (ID: ${nandiId})...`);

    const { data: mappings, error } = await supabase
        .from('mappings')
        .select('*')
        .eq('dealership_id', nandiId);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (mappings && mappings.length > 0) {
        console.log(`FOUND ${mappings.length} mappings:`);
        for (const m of mappings) {
            const { data: user } = await supabase.from('users').select('name').eq('id', m.photographer_id).single();
            const { data: cluster } = await supabase.from('clusters').select('name').eq('id', m.cluster_id).single();
            console.log(`- Type: ${m.mapping_type}, Cluster: ${cluster?.name}, Photographer: ${user?.name || m.photographer_id}`);
        }
    } else {
        console.log('No mappings found for Nandi Toyota.');
    }
}

checkMappings();

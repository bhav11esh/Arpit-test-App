
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function dumpClusters() {
    const { data, error } = await supabase.from('clusters').select('*');
    if (error) {
        console.error(error);
        return;
    }
    console.log('--- CLUSTERS ---');
    data.forEach(c => console.log(`ID: ${c.id} | Name: "${c.name}"`));
}

dumpClusters();

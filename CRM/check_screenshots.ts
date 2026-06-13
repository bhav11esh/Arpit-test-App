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

async function checkScreenshots() {
    console.log('Querying screenshots count...');
    const { data, error } = await supabase
        .from('screenshots')
        .select('id, type, uploaded_at, deleted_at, delivery_id');

    if (error) {
        console.error('Error fetching screenshots:', error);
        return;
    }

    console.log(`Total screenshots in DB: ${data.length}`);
    const types: Record<string, number> = {};
    const deletedCount = data.filter(s => s.deleted_at).length;
    
    data.forEach(s => {
        types[s.type] = (types[s.type] || 0) + 1;
    });

    console.log('Counts by type:', types);
    console.log('Deleted count:', deletedCount);

    if (data.length > 0) {
        console.log('\nSample screenshots (first 10):');
        data.slice(0, 10).forEach(s => {
            console.log(`[${s.id}] Type: ${s.type} | Uploaded: ${s.uploaded_at} | Deleted: ${s.deleted_at} | Delivery: ${s.delivery_id}`);
        });
    }
}

checkScreenshots();

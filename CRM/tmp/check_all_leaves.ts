
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey!);

async function checkLeaves() {
    const today = '2026-04-10';
    
    console.log(`Checking all leaves for today (${today})...`);

    const { data: leaves, error } = await supabase
        .from('leaves')
        .select('*')
        .eq('date', today);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (leaves && leaves.length > 0) {
        console.log(`FOUND ${leaves.length} leaves:`);
        for (const l of leaves) {
            const { data: user } = await supabase.from('users').select('name').eq('id', l.photographer_id).single();
            console.log(`- Photographer: ${user?.name || l.photographer_id}, Type: ${l.half}`);
        }
    } else {
        console.log('No leaves found for today.');
    }
}

checkLeaves();

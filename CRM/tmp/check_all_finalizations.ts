
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey!);

async function checkAllFinalizations() {
    const today = '2026-04-10';

    console.log(`Checking all global finalizations on ${today}...`);

    const { data: logs, error } = await supabase
        .from('log_events')
        .select('*')
        .eq('type', 'SHOWROOM_FINALIZED')
        .gte('created_at', `${today}T00:00:00Z`)
        .lte('created_at', `${today}T23:59:59Z`);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (logs && logs.length > 0) {
        console.log(`FOUND ${logs.length} finalization events:`);
        for (const log of logs) {
            const { data: user } = await supabase.from('users').select('name').eq('id', log.user_id).single();
            console.log(`- Showroom: ${log.target_id} Finalized by ${user?.name || log.user_id} at ${log.created_at}`);
        }
    } else {
        console.log('No global finalizations found.');
    }
}

checkAllFinalizations();

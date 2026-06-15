
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars (Service Role Key required)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncData() {
    console.log('--- Starting Data Synchronization ---');

    // 1. Find photographers with null city
    const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('id, name, city')
        .eq('role', 'PHOTOGRAPHER')
        .is('city', null);

    if (fetchError) {
        console.error('Fetch Error:', fetchError);
        return;
    }

    console.log(`Found ${users?.length} photographers with missing city.`);

    if (users && users.length > 0) {
        for (const user of users) {
            console.log(`Updating ${user.name} (${user.id})...`);
            const { error: updateError } = await supabase
                .from('users')
                .update({ city: 'bengaluru' })
                .eq('id', user.id);

            if (updateError) {
                console.error(`Failed to update ${user.name}:`, updateError);
            } else {
                console.log(`Successfully updated ${user.name} to 'bengaluru'.`);
            }
        }
    }

    console.log('--- Synchronization Complete ---');
}

syncData();

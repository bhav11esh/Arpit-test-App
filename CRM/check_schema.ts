import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
    console.log('Checking live_bookings table...');
    try {
        const { data, error } = await supabase
            .from('live_bookings')
            .select('*')
            .limit(1);

        if (error) {
            if (error.code === 'PGRST116' || error.message.includes('not found')) {
                console.log('RESULT: Table does NOT exist.');
            } else {
                console.error('Error:', error);
            }
        } else {
            console.log('RESULT: Table exists.');
            // Try to check if activation_code exists by specifically selecting it
            const { error: colError } = await supabase
                .from('live_bookings')
                .select('activation_code')
                .limit(1);

            if (colError && colError.message.includes('column "activation_code" does not exist')) {
                console.log('RESULT: activation_code column is MISSING.');
            } else if (!colError) {
                console.log('RESULT: activation_code column EXISTS.');
            } else {
                console.error('Column Check Error:', colError);
            }
        }
    } catch (err) {
        console.error('Execution Error:', err);
    }
}

checkTable();

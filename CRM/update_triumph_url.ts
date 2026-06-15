import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const newUrl = 'https://script.google.com/macros/s/AKfycbw0zg5p8UVjpI69bWvKZHiSStuLdcnlUSPoLKzEK9bIQQC4PQmVAwxx-1aiwNT3CIBOmA/exec';

async function update() {
    console.log('Updating Triumph Popular sync URL...');
    const { data, error } = await supabase
        .from('dealerships')
        .update({ google_sync_url: newUrl })
        .eq('name', 'Triumph Popular')
        .select();

    if (error) {
        console.error('Error updating sync URL:', error);
    } else {
        console.log('Update Successful:', JSON.stringify(data, null, 2));
    }
}

update();

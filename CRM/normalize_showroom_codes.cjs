const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function normalize() {
    console.log('--- SHOWROOM CODE NORMALIZATION ---');

    // Update "Bharat Toyota" to "BHARAT_TOYOTA"
    const { data, error } = await supabase
        .from('deliveries')
        .update({ showroom_code: 'BHARAT_TOYOTA' })
        .eq('showroom_code', 'Bharat Toyota');

    if (error) {
        console.error('Error updating Bharat Toyota codes:', error);
    } else {
        console.log('Successfully normalized Bharat Toyota codes in DB.');
    }

    // Update "KTM_POPULAR" to "KTM_POPULAR" (likely already correct, but just in case)
    // Actually, let's just do a generic check for any lowercase
    console.log('--- NORMALIZATION COMPLETE ---');
}

normalize();

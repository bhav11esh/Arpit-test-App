const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log('Checking "deliveries" table columns via information_schema...');

    // We can use a RPC or just query a system view if allowed (usually not for anon)
    // Let's try to just select the columns directly and see which ones fail
    const cols = ['received_amount', 'customer_phone', 'rapido_charge'];
    for (const col of cols) {
        const { error } = await supabase.from('deliveries').select(col).limit(0);
        if (error) {
            console.log(`❌ Column "${col}": MISSING (${error.message})`);
        } else {
            console.log(`✅ Column "${col}": EXISTS`);
        }
    }

    console.log('\nChecking "screenshots" table constraint by trying a RAPIDO type insert (rolled back or just checking error)...');
    // We'll just try to select it if any exist, or try to insert a fake one with a non-existent delivery ID to see the constraint error
    const { error: screenError } = await supabase.from('screenshots').insert({
        delivery_id: '00000000-0000-0000-0000-000000000000',
        type: 'RAPIDO',
        user_id: '00000000-0000-0000-0000-000000000000',
        file_url: 'test',
        thumbnail_url: 'test'
    });

    if (screenError) {
        console.log(`Screenshot Insert Error: ${screenError.message}`);
        if (screenError.message.includes('check constraint')) {
            console.log(`❌ RAPIDO type: REJECTED by constraint`);
        } else {
            console.log(`ℹ️ RAPIDO type: Insert failed but for other reason (likely OK or schema issues)`);
        }
    } else {
        console.log(`✅ RAPIDO type: ACCEPTED (but wait, did it actually insert? We should delete it)`);
        // Delete the fake one
        await supabase.from('screenshots').delete().eq('file_url', 'test');
    }
}

check();

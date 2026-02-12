const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRoyalEnfield() {
    console.log('--- Checking ALL Royal Enfield Dealerships ---');

    // 1. Find Dealerships
    const { data: dealerships, error: dealerError } = await adminSupabase
        .from('dealerships')
        .select('*')
        .ilike('name', '%Royal%');

    if (dealerError) {
        console.error('Error finding dealerships:', dealerError);
        return;
    }

    console.log(`Found ${dealerships.length} dealerships:`);

    for (const d of dealerships) {
        console.log(`\n[${d.name}] (ID: ${d.id})`);

        // Get Primary Photographer
        const { data: mapping, error: mapError } = await adminSupabase
            .from('mappings')
            .select('*, users(name, email)')
            .eq('dealership_id', d.id)
            .eq('mapping_type', 'PRIMARY')
            .single();

        if (mapping) {
            console.log(`  -> Primary: ${mapping.users?.name} (${mapping.users?.email})`);
        } else {
            console.log(`  -> Primary: NONE`);
        }
    }
}

checkRoyalEnfield();

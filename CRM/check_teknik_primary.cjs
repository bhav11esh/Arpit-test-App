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

async function checkTeknikPrimary() {
    console.log('--- Checking Primary Photographer for Teknik Motors ---');

    // 1. Find Dealership
    const { data: dealerships, error: dealerError } = await adminSupabase
        .from('dealerships')
        .select('*')
        .ilike('name', '%Teknik%');

    if (dealerError) {
        console.error('Error finding dealership:', dealerError);
        return;
    }

    if (!dealerships || dealerships.length === 0) {
        console.log('No dealership found matching "Teknik"');
        return;
    }

    const teknik = dealerships[0];
    console.log(`Found Dealership: ${teknik.name} (ID: ${teknik.id})`);

    // 2. Find Primary Mapping
    const { data: mappings, error: mapError } = await adminSupabase
        .from('mappings')
        .select('photographer_id')
        .eq('dealership_id', teknik.id)
        .eq('mapping_type', 'PRIMARY');

    if (mapError) {
        console.error('Error finding mappings:', mapError);
        return;
    }

    if (!mappings || mappings.length === 0) {
        console.log('No PRIMARY mapping found for this dealership.');
    } else {
        const pId = mappings[0].photographer_id;
        console.log(`Found Primary Photographer ID: ${pId}`);

        // 3. Fetch User Details (Safe Columns)
        const { data: user, error: userError } = await adminSupabase
            .from('users')
            .select('*')
            .eq('id', pId)
            .single();

        if (userError) {
            console.error('Error fetching user:', userError);
        } else {
            console.log(`\nPRIMARY PHOTOGRAPHER FOUND (Minimal):`);
            // Check if name/email exist as properties
            if (user) {
                console.log(`NAME: ${user.name}`);
                console.log(`EMAIL: ${user.email}`);
                console.log(`ID: ${user.id}`);
            } else {
                console.log("User object is null");
            }
        }
    }
}

checkTeknikPrimary();

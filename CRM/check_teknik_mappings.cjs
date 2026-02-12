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

async function checkTeknikMappings() {
    console.log('--- Checking ALL Mappings for Teknik Motors ---');

    // 1. Find Dealership
    const { data: dealerships, error: dealerError } = await adminSupabase
        .from('dealerships')
        .select('*')
        .ilike('name', '%Teknik%');

    if (dealerError || !dealerships?.length) {
        console.error('Error/No dealership:', dealerError);
        return;
    }

    const teknik = dealerships[0];
    console.log(`Dealership: ${teknik.name} (${teknik.id})`);

    // 2. Find Mappings
    const { data: mappings, error: mapError } = await adminSupabase
        .from('mappings')
        .select('*, users(id, name, email)')
        .eq('dealership_id', teknik.id);

    if (mapError) {
        console.error('Error fetching mappings:', mapError);
        return;
    }

    console.log(`Found ${mappings.length} mappings:`);
    mappings.forEach(m => {
        console.log(`- Type: ${m.mapping_type}`);
        console.log(`  User: ${m.users?.name} (${m.users?.email})`);
        console.log(`  ID: ${m.users?.id}`);
    });

    // 3. Find Deliveries for Today
    console.log('\n--- Deliveries for Today (2026-02-08) ---');
    const today = '2026-02-08';
    const { data: deliveries, error: delError } = await adminSupabase
        .from('deliveries')
        .select('*')
        .eq('date', today)
        .ilike('showroom_code', '%Teknik%'); // Try matching code approx

    if (delError) console.error(delError);
    else {
        deliveries.forEach(d => {
            console.log(`Delivery: ${d.delivery_name}`);
            console.log(`  Assigned To: ${d.assigned_user_id}`);
            console.log(`  Status: ${d.status}`);
        });
    }
}

checkTeknikMappings();

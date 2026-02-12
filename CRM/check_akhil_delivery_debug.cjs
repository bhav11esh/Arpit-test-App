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

async function debugAkhil() {
    console.log('--- Debugging Akhil & Royal Enfield ---');

    console.log('\n1. Searching for Akhil (aka246966@gmail.com)...');
    const { data: user } = await adminSupabase.from('users').select('*').eq('email', 'aka246966@gmail.com').single();
    if (user) {
        console.log(`Akhil Found: ${user.name} (ID: ${user.id})`);
    } else {
        console.log('Akhil NOT found');
    }
    const akhilId = user?.id;

    console.log('\n2. Akhil\'s PRIMARY Mappings:');
    if (akhilId) {
        const { data: mappings } = await adminSupabase
            .from('mappings')
            .select('*, dealerships(name)')
            .eq('photographer_id', akhilId)
            .eq('mapping_type', 'PRIMARY');

        mappings.forEach(m => {
            console.log(`- ${m.dealerships?.name} (${m.dealership_id})`);
        });
    }

    console.log('\n3. ALL Royal Enfield Dealerships:');
    const { data: dealers } = await adminSupabase
        .from('dealerships')
        .select('*')
        .ilike('name', '%Royal%');

    dealers.forEach(d => {
        console.log(`- ${d.name} (${d.id})`);
    });

    console.log('\n4. Inspecting Today\'s Royal Enfield Deliveries:');
    const { data: deliveries } = await adminSupabase
        .from('deliveries')
        .select('*')
        .eq('date', '2026-02-08')
        .ilike('showroom_code', '%Royal%');

    deliveries.forEach(d => {
        console.log(`\nDelivery: ${d.delivery_name}`);
        console.log(`ID: ${d.id}`);
        console.log(`Assigned To: ${d.assigned_user_id}`);
        console.log(`Status: ${d.status}`);
        console.log(`Unassignment Info: ${d.unassignment_reason} | By: ${d.unassignment_by} | Time: ${d.unassignment_timestamp}`);
    });
}

debugAkhil();

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

async function checkBimalNexa() {
    console.log('--- Checking Bimal Nexa Mappings ---');

    // 1. Find the dealership ID for "Bimal Nexa"
    const { data: dealerships, error: dealError } = await adminSupabase
        .from('dealerships')
        .select('*')
        .ilike('name', '%Bimal Nexa%');

    if (dealError || !dealerships.length) {
        console.error('Dealership not found:', dealError || 'No match');
        return;
    }

    const bimal = dealerships[0];
    console.log(`Found Dealership: ${bimal.name} (${bimal.id})`);

    // 2. Find all mappings for this dealership
    const { data: mappings, error: mapError } = await adminSupabase
        .from('mappings')
        .select(`
            *,
            users ( id, name, email, role )
        `)
        .eq('dealership_id', bimal.id);

    if (mapError) {
        console.error('Error fetching mappings:', mapError);
        return;
    }

    console.log(`Found ${mappings.length} mappings for Bimal Nexa:`);
    mappings.forEach(m => {
        console.log(`- [${m.mapping_type}] Assigned to: ${m.users?.name} (${m.users?.email})`);
    });
}

checkBimalNexa();

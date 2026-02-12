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

async function checkDeliveries() {
    console.log('--- Checking Deliveries for Bimal Nexa (Today) ---');

    // Get today's date in YYYY-MM-DD
    // Note: The app uses a specific utility for "Operational Date" (6 AM cutoff)
    // For now, I'll check strictly '2026-02-08'
    const today = '2026-02-08';

    console.log(`Querying date: ${today}`);

    // 1. Get deliveries by name/code partial match
    const { data: deliveries, error } = await adminSupabase
        .from('deliveries')
        .select('*')
        .eq('date', today)
        .ilike('showroom_code', '%Bimal%');

    if (error) {
        console.error('Error fetching deliveries:', error);
        return;
    }

    console.log(`Found ${deliveries.length} deliveries:`);
    deliveries.forEach(d => {
        console.log(`- ID: ${d.id}`);
        console.log(`  Code: "${d.showroom_code}"`);
        console.log(`  Name: "${d.delivery_name}"`);
        console.log(`  Status: ${d.status}`);
        console.log(`  Assigned To: ${d.assigned_user_id}`);
        console.log(`  Cluster Code: "${d.cluster_code}"`);
    });
}

checkDeliveries();

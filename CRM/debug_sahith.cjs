
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    const log = (msg) => console.log(msg);

    try {
        const envPath = path.join(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const [key, val] = line.split('=');
            if (key && val) env[key.trim()] = val.trim().replace(/"/g, '');
        });

        const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);

        // 1. Get Sahith's ID (assuming name 'Sahith' or email)
        // I'll search for user with email starting with 'sahith' or name 'Sahith'
        // But since I don't know exact email, I'll list users to find him

        // Actually, I'll check the delivery first
        const { data: deliveries, error: dError } = await client
            .from('deliveries')
            .select('*')
            .ilike('delivery_name', '%NANDI_TOYOTA_21_50%');

        if (dError || !deliveries.length) {
            log('Delivery not found!');
            return;
        }

        const delivery = deliveries[0];
        log('Delivery Found:');
        log(JSON.stringify(delivery, null, 2));

        // 2. Check Sahith's mapping
        // I need to find which user is 'Sahith'. I'll look for user_mappings
        const { data: mappings, error: mError } = await client
            .from('user_mappings')
            .select('*, profiles:user_id(name, email)');

        if (mError) {
            log('Error fetching mappings: ' + mError.message);
            return;
        }

        const sahithMapping = mappings.find(m => m.profiles?.name?.toLowerCase().includes('sahith') || m.profiles?.email?.toLowerCase().includes('sahith'));

        if (!sahithMapping) {
            log('Sahith not found in mappings!');
            // List all names to help debug
            log('Available users: ' + mappings.map(m => m.profiles?.name).join(', '));
        } else {
            log('\nSahith Mapping:');
            log(JSON.stringify(sahithMapping, null, 2));

            const match = sahithMapping.cluster_code === delivery.cluster_code;
            log(`\nCluster Match? ${match} (Sahith: ${sahithMapping.cluster_code} vs Delivery: ${delivery.cluster_code})`);
        }

    } catch (e) {
        log('Script Error: ' + e.message);
    }
}

run();

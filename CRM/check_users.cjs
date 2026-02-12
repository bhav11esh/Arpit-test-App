
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

        // 1. Get Delivery details
        const { data: deliveries } = await client
            .from('deliveries')
            .select('id, delivery_name, cluster_code, status, timing')
            .ilike('delivery_name', '%NANDI_TOYOTA_21_50%');

        if (deliveries && deliveries.length) {
            log('--- DELIVERY ---');
            log(JSON.stringify(deliveries[0], null, 2));
        } else {
            log('--- DELIVERY NOT FOUND ---');
        }

        // 2. Get Users and Mappings
        // We need to join profiles and user_mappings
        log('\n--- USERS & MAPPINGS ---');

        // Fetch profiles
        const { data: profiles } = await client.from('profiles').select('*');
        // Fetch mappings
        const { data: mappings } = await client.from('user_mappings').select('*');

        if (!profiles || !mappings) {
            log('Error fetching profiles or mappings');
            return;
        }

        profiles.forEach(p => {
            const mapping = mappings.find(m => m.user_id === p.id);
            const cluster = mapping ? mapping.cluster_code : 'NO MAPPING';
            const role = p.role;

            // Highlight Sahith
            const isSahith = p.name?.toLowerCase().includes('sahith') || p.email?.toLowerCase().includes('sahith');
            const prefix = isSahith ? '>>> ' : '    ';

            log(`${prefix}${p.name} (${p.email}) - Role: ${role} - Cluster: ${cluster}`);
        });

    } catch (e) {
        log('Script Error: ' + e.message);
    }
}

run();

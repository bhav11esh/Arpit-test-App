
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    const logFile = 'nandi_debug_log.txt';
    fs.writeFileSync(logFile, '--- NANDI DEBUG LOG ---\n');
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg) + '\n');
    };

    try {
        const envPath = path.join(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const [key, val] = line.split('=');
            if (key && val) env[key.trim()] = val.trim().replace(/"/g, '');
        });

        const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);

        // 1. Get Mallikarjun User
        const { data: users } = await supabase.from('users').select('*').ilike('email', '%pavanmanne735%');
        const mallikarjun = users[0];
        log('Mallikarjun: ' + (mallikarjun ? `${mallikarjun.name} [${mallikarjun.id}]` : 'NOT FOUND'));

        if (mallikarjun) {
            // 2. Get Mappings
            log('\n=== MAPPINGS ===');
            const { data: mappings } = await supabase.from('mappings').select('*').eq('photographer_id', mallikarjun.id);

            // Enrich with dealerships
            if (mappings && mappings.length > 0) {
                const { data: deals } = await supabase.from('dealerships').select('*').in('id', mappings.map(m => m.dealership_id));
                mappings.forEach(m => {
                    const d = deals.find(x => x.id === m.dealership_id);
                    log(`Type: ${m.mapping_type} | Dealer: ${d ? d.name : 'Unknown'} [${m.dealership_id}]`);
                });
            } else {
                log('No mappings found.');
            }

            // 3. Get Delivery
            log('\n=== DELIVERY ===');
            const { data: deliveries } = await supabase.from('deliveries')
                .select('*')
                .ilike('delivery_name', '%NANDI_TOYOTA%')
                .order('created_at', { ascending: false })
                .limit(5);

            deliveries.forEach(d => {
                log(`[${d.delivery_name}] Code: ${d.showroom_code} | Type: ${d.showroom_type} | Status: ${d.status}`);
            });
        }

    } catch (e) {
        log('ERROR: ' + e.message);
    }
}

run();


const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    const logFile = 'bimal_2140_debug.txt';
    fs.writeFileSync(logFile, '--- BIMAL 21:40 DEBUG ---\n');
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

        // 2. Get Delivery
        const deliveryName = '07-02-2026_BIMAL_NEXA_21_40';
        log(`Checking delivery: ${deliveryName}`);

        const { data: deliveries } = await supabase.from('deliveries')
            .select('*')
            .eq('delivery_name', deliveryName);

        const d = deliveries && deliveries[0];
        if (d) {
            log('\n=== DELIVERY ===');
            log(d);
            log(`Timing in DB: '${d.timing}' (Type: ${typeof d.timing})`);

            // 3. Get Rejections
            const { data: rejections } = await supabase.from('delivery_rejections').select('*').eq('delivery_id', d.id);
            log('\n=== REJECTIONS ===');
            log(rejections);

            if (mallikarjun && rejections) {
                const hasRejected = rejections.some(r => r.user_id === mallikarjun.id);
                log(`\nHas Mallikarjun rejected? ${hasRejected}`);
            }

            // 4. Check Cluster
            if (mallikarjun && d.cluster_code !== mallikarjun.cluster_code) {
                log(`CRITICAL: Cluster mismatch! User: ${mallikarjun.cluster_code} vs Delivery: ${d.cluster_code}`);
            }

        } else {
            log('Delivery not found!');
        }

    } catch (e) {
        log('ERROR: ' + e.message);
    }
}

run();

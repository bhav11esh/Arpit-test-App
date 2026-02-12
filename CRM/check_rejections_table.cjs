
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

        // 1. Try with Service Role (Admin)
        log('--- Checking with SERVICE ROLE ---');
        const adminClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);
        const { data: adminData, error: adminError } = await adminClient.from('delivery_rejections').select('*').limit(1);

        if (adminError) {
            log('Admin Error: ' + JSON.stringify(adminError, null, 2));
        } else {
            log('Admin Success. Data: ' + JSON.stringify(adminData));
        }

        // 2. Try with Anon (Client)
        log('\n--- Checking with ANON KEY ---');
        const anonClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
        const { data: anonData, error: anonError } = await anonClient.from('delivery_rejections').select('*').limit(1);

        if (anonError) {
            log('Anon Error: ' + JSON.stringify(anonError, null, 2));
        } else {
            log('Anon Success. Data: ' + JSON.stringify(anonData));
        }

    } catch (e) {
        log('Script Error: ' + e.message);
    }
}

run();

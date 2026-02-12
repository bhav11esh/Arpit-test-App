
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    const logFile = 'crm_mappings_log.txt';
    fs.writeFileSync(logFile, '--- MAPPINGS DEBUG LOG ---\n');
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

        const url = env.VITE_SUPABASE_URL;
        const key = env.VITE_SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(url, key);

        // 1. Get Sahith ID
        // 8f053ed2-788b-4fa9-99f5-88ac1f4c85af (from previous log)
        const sahithId = '8f053ed2-788b-4fa9-99f5-88ac1f4c85af';

        // 2. Fetch Mappings
        log('\n=== SAHITH MAPPINGS ===');
        const { data: mappings } = await supabase.from('mappings').select('*').eq('photographer_id', sahithId);
        log(mappings);

        // 3. Fetch Dealerships for mappings
        if (mappings && mappings.length > 0) {
            const ids = mappings.map(m => m.dealership_id);
            const { data: dealerships } = await supabase.from('dealerships').select('*').in('id', ids);
            log('\n=== DEALERSHIPS ===');
            log(dealerships.map(d => `${d.name} [${d.id}]`));
        }

        // 4. Update Validation: Can we extract time from name?
        // 07-02-2026_BIMAL_NEXA_21_05 -> 21:05
        // 07-02-2026_KHIVRAJ_TRIUMPH_21_05 -> 21:05
        // If I update these, does it fix it?

    } catch (e) {
        log('ERROR: ' + e.message);
    }
}

run();

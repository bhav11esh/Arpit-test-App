
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    const logFile = 'crm_debug_log.txt';
    fs.writeFileSync(logFile, '--- CRM DEBUG LOG ---\n');
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg) + '\n');
    };

    try {
        // Load env
        const envPath = path.join(process.cwd(), '.env');
        log('Loading env from: ' + envPath);
        if (!fs.existsSync(envPath)) {
            throw new Error('.env file not found at ' + envPath);
        }
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const [key, val] = line.split('=');
            if (key && val) env[key.trim()] = val.trim().replace(/"/g, '');
        });

        const url = env.VITE_SUPABASE_URL;
        const key = env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

        log(`URL: ${url}`);
        log(`Key: ${key.substring(0, 10)}... (Service Role: ${!!env.VITE_SUPABASE_SERVICE_ROLE_KEY})`);

        const supabase = createClient(url, key);

        // 1. Fetch Users
        log('\n=== USERS ===');

        const { data: allUsers, error: userError } = await supabase.from('users').select('id, email, name, cluster_code, role, active');

        if (userError) {
            log('Error fetching users: ' + JSON.stringify(userError));
        } else if (!allUsers) {
            log('No users found.');
        } else {
            const sahith = allUsers.find(u => u.email && u.email.toLowerCase().includes('sahith'));
            const mallikarjun = allUsers.find(u => (u.name && u.name.toLowerCase().includes('mallikarjun')) || (u.email && u.email.toLowerCase().includes('mallikarjun')));

            log(`Sahith: ${sahith ? `${sahith.name} (${sahith.cluster_code}) [${sahith.id}]` : 'NOT FOUND'}`);
            if (sahith) log(sahith);

            log(`Mallikarjun: ${mallikarjun ? `${mallikarjun.name} (${mallikarjun.cluster_code}) [${mallikarjun.id}]` : 'NOT FOUND'}`);
            if (mallikarjun) log(JSON.stringify(mallikarjun));
        }

        // 2. Fetch Bimal Nexa Delivery (Unassigned)
        log('\n=== BIMAL NEXA DELIVERY ===');
        const { data: bimal, error: bimalError } = await supabase.from('deliveries')
            .select('*')
            .ilike('delivery_name', '%Bimal_Nexa%')
            .order('created_at', { ascending: false })
            .limit(5);

        if (bimalError) {
            log('Error fetching Bimal: ' + JSON.stringify(bimalError));
        } else if (bimal) {
            for (const d of bimal) {
                log(`[${d.id}] ${d.delivery_name} | Status: ${d.status} | Showroom: ${d.showroom_code} | Cluster: ${d.cluster_code} | Type: ${d.showroom_type} | Timing: ${d.timing} | Date: ${d.date}`);
                if (d.status === 'UNASSIGNED') {
                    const { data: rejections } = await supabase.from('delivery_rejections').select('*').eq('delivery_id', d.id);
                    log(`Rejections for ${d.delivery_name}: ${JSON.stringify(rejections)}`);
                }
            }
        }

        // 3. Fetch Khivraj Delivery
        log('\n=== KHIVRAJ DELIVERY ===');
        const { data: khivraj, error: khivrajError } = await supabase.from('deliveries')
            .select('*')
            .ilike('delivery_name', '%Khivraj%')
            .order('created_at', { ascending: false })
            .limit(5);

        if (khivrajError) {
            log('Error fetching Khivraj: ' + JSON.stringify(khivrajError));
        } else if (khivraj) {
            for (const d of khivraj) {
                log(`[${d.id}] ${d.delivery_name} | Status: ${d.status} | Cluster: ${d.cluster_code} | RejectedByAll: ${d.rejected_by_all} | Date: ${d.date} | Timing: ${d.timing}`);
                const { data: rejections } = await supabase.from('delivery_rejections').select('*').eq('delivery_id', d.id);
                log(`Rejections for ${d.delivery_name}: ${JSON.stringify(rejections)}`);
            }
        }

    } catch (e) {
        log('ERROR: ' + e.message);
        log(e.stack);
    }
}

run();

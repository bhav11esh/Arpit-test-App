
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// MOCK UTILS to match app logic exactly
function shouldShowAcceptRejectPrompt(delivery, userClusterCode, currentTime) {
    if (!delivery.timing) { console.log('FAIL: No timing'); return false; }
    if (delivery.status !== 'UNASSIGNED') { console.log(`FAIL: Status is ${delivery.status}`); return false; }

    // Normalization for comparison
    const dCluster = delivery.cluster_code?.trim() || '';
    const uCluster = userClusterCode?.trim() || '';

    if (dCluster !== uCluster) {
        console.log(`FAIL: Cluster mismatch '${dCluster}' vs '${uCluster}'`);
        console.log(`Buffers: D=${Buffer.from(dCluster).toString('hex')} U=${Buffer.from(uCluster).toString('hex')}`);
        return false;
    }

    // Parse delivery date and timing
    const [year, month, day] = delivery.date.split('-').map(Number);
    const [hours, minutes] = delivery.timing.split(':').map(Number);

    const deliveryTime = new Date(year, month - 1, day, hours, minutes);
    const thirtyMinsBefore = new Date(deliveryTime.getTime() - 30 * 60 * 1000);

    console.log(`Time Check: Current=${currentTime.toISOString()} Window=[${thirtyMinsBefore.toISOString()} - ${deliveryTime.toISOString()})`);

    return currentTime >= thirtyMinsBefore && currentTime < deliveryTime;
}

async function run() {
    const log = (msg) => console.log(msg);

    try {
        const envPath = path.join(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const lineSplit = line.split('=');
            if (lineSplit.length > 1) {
                env[lineSplit[0].trim()] = lineSplit.slice(1).join('=').trim().replace(/"/g, '');
            }
        });

        const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);

        // 1. Get Mallikarjun by email fragment
        const { data: { users } } = await client.auth.admin.listUsers();
        const user = users.find(u => u.email?.includes('mallik') || u.user_metadata?.name?.toLowerCase().includes('mallik'));

        if (!user) { log('NO MALLIKARJUN'); return; }
        log(`USER: ${user.email} (${user.id})`);

        // 2. Get User Cluster
        const { data: maps } = await client.from('mappings').select('*').eq('photographer_id', user.id);
        const { data: cluster } = maps.length ? await client.from('clusters').select('name').eq('id', maps[0].cluster_id).single() : { data: null };
        const userClusterCode = cluster ? cluster.name : '';
        log(`USER CLUSTER: '${userClusterCode}'`);

        // 3. Get Delivery 22:20
        const today = '2026-02-07';
        const { data: deliveries } = await client.from('deliveries')
            .select('*')
            .eq('date', today)
            .ilike('delivery_name', '%BIMAL%22_20%');

        if (deliveries && deliveries.length) {
            const d = deliveries[0];
            log(`DELIVERY: ${d.delivery_name}`);
            log(`STATUS: ${d.status}`);

            // 4. SIMULATE LOGIC
            // We use system time, but we need to account for timezone if server is UTC.
            // App runs in browser (local time). Node runs in system time.
            // I will use '2026-02-07T22:04:26' (time from User Query + adjustment?)
            // Actually, user query was at 22:04.
            // Delivery is 22:20.
            // Let's create a specific mock date.

            // Construct 22:04 local time date object
            // Assuming strict ISO format
            const mockNow = new Date('2026-02-07T22:04:00'); // Assume UTC if no offset? Browser uses local.
            // Wait, app uses new Date(). If user acts around 22:04 local.
            // Delivery uses YYYY-MM-DD and HH:mm.
            // Date construction: new Date(year, month-1, day, hours, minutes) -> Local time.
            // So I should use local time logic here too.

            // Mock current time: 22:05
            const now = new Date(); // This machine's time might be UTC or Local.
            // I'll manually construct a time relative to delivery to check window logic.

            log('\n--- SIMULATION ---');
            const dDateParts = d.date.split('-');
            const dTimeParts = d.timing.split(':');
            const dTime = new Date(dDateParts[0], dDateParts[1] - 1, dDateParts[2], dTimeParts[0], dTimeParts[1]);

            // Test at T-10 mins (inside window)
            const testTime = new Date(dTime.getTime() - 10 * 60 * 1000);
            log(`Testing at T-10 (${testTime.toLocaleTimeString()}):`);
            const result = shouldShowAcceptRejectPrompt(d, userClusterCode, testTime);
            log(`RESULT: ${result}`);

            // 4. Check Rejections
            const { data: rejections } = await client.from('delivery_rejections')
                .select('*')
                .eq('delivery_id', d.id).eq('user_id', user.id);
            log(`REJECTIONS: ${rejections.length}`);

        } else {
            log('DELIVERY NOT FOUND');
        }

    } catch (e) {
        log('ERR: ' + e.message);
    }
}

run();

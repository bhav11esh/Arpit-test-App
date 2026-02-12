
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Check User ID & Cluster
    const { data: users } = await supabase.from('users').select('*').ilike('email', '%pavanmanne%');
    console.log('--- USER INFO ---');
    console.log(JSON.stringify(users, null, 2));

    // 2. Check Deliveries for today
    const { data: deliveries } = await supabase.from('deliveries').select('*').eq('date', '2026-02-05');
    console.log('\n--- DELIVERIES TODAY ---');
    deliveries.forEach(d => {
        console.log(`- [${d.id}] ${d.delivery_name} | Showroom: ${d.showroom_code} | Cluster: ${d.cluster_code} | Status: ${d.status} | ShowroomType: ${d.showroom_type}`);
    });

    // 3. Check Mappings
    const { data: mappings } = await supabase.from('mappings').select('*');
    console.log('\n--- MAPPINGS ---');
    console.log(JSON.stringify(mappings, null, 2));
}
run();

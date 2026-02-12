
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const today = '2026-02-05';

    console.log('--- DELIVERIES FOR TODAY (2026-02-05) ---');
    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('date', today);

    if (error) {
        console.error(error);
    } else {
        console.log(`Found ${deliveries.length} deliveries for today.`);
        deliveries.forEach(d => {
            console.log(`Name: ${d.delivery_name} | Cluster: ${d.cluster_code} | Status: ${d.status} | Type: ${d.showroom_type}`);
        });
    }
}

run();

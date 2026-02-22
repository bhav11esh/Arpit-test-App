
const { createClient } = require('@supabase/supabase-js');

const urlFromEnv = 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function checkSchema() {
    console.log('--- CHECKING DELIVERIES SCHEMA ---');

    // Fetch one delivery to see fields
    const { data: delivery, error } = await supabase
        .from('deliveries')
        .select('*')
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Error fetching delivery:', error);
        return;
    }

    if (delivery) {
        console.log('Sample Delivery Fields:', Object.keys(delivery));
        console.log('Sample Cluster Code:', delivery.cluster_code);
        console.log('Sample Cluster ID (if exists):', delivery.cluster_id); // Check if this field exists
    } else {
        console.log('No deliveries found.');
    }

    // Also check distinct cluster codes used
    const { data: distinctCodes } = await supabase
        .from('deliveries')
        .select('cluster_code')
        .limit(50);

    if (distinctCodes) {
        const unique = [...new Set(distinctCodes.map(d => d.cluster_code))];
        console.log('Distinct Cluster Codes found:', unique);
    }
}

checkSchema();

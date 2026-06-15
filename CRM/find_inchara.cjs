
const { createClient } = require('@supabase/supabase-js');

const urlFromEnv = 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function findInchara() {
    console.log('--- FINDING INCHARA ---');

    const { data: users } = await supabase.from('users').select('id, name, email, cluster_code').ilike('name', '%Inchara%');

    if (users && users.length > 0) {
        console.log('Found User(s):', users);

        // Also get Kanakapura Cluster ID for comparison
        const { data: cluster } = await supabase.from('clusters').select('id, name').ilike('name', '%Kanakapura%').single();
        console.log(`Kanakapura Cluster ID: ${cluster?.id}`);
    } else {
        console.log('User "Inchara" not found.');
    }
}

findInchara();

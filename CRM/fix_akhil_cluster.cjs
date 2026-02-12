
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const clusterCode = 'Whitefield-Indiranagar';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`🛠️ Fixing Akhil's Cluster Code...`);

    // Update cluster_code for Akhil
    const { error: e1 } = await supabase
        .from('users')
        .update({ cluster_code: clusterCode })
        .ilike('email', '%aka246966%'); // Akhil's email from previous check

    if (e1) console.error('Error updating Akhil:', e1);
    else console.log('✅ Akhil cluster code updated to Whitefield-Indiranagar');
}
run();

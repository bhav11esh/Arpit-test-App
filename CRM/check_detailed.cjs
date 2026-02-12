
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const today = '2026-02-05';
    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('date', today);

    if (error) {
        console.error(error);
    } else {
        console.log(`TOTAL TODAY: ${deliveries.length}`);
        deliveries.forEach(d => {
            console.log(`- [${d.id}] ${d.delivery_name} | Showroom: ${d.showroom_code} | Status: ${d.status} | Assigned: ${d.assigned_user_id === 'bc268775-f79f-440b-bea4ba1dc762' ? 'YES' : 'NO (' + d.assigned_user_id + ')'} | RejectedByAll: ${d.rejected_by_all}`);
        });
    }
}
run();

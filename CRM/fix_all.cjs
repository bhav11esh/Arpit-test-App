
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const oldId = 'bc268775-f79f-4400-b10b-bea4ba1dc762';
const newId = 'bc268775-f79f-440b-bea4ba1dc762';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`Fixing IDs for Mallikarjun: ${oldId} -> ${newId}`);

    // 1. Update users table
    const { error: userError } = await supabase
        .from('users')
        .update({ id: newId })
        .eq('id', oldId);
    if (userError) console.error('Error updating users:', userError);
    else console.log('Updated users table');

    // 2. Update mappings table
    const { error: mappingError } = await supabase
        .from('mappings')
        .update({ photographer_id: newId })
        .eq('photographer_id', oldId);
    if (mappingError) console.error('Error updating mappings:', mappingError);
    else console.log('Updated mappings table');

    // 3. Rescuing ALL deliveries (setting status to ASSIGNED and ID to newId)
    // We update assigned_user_id to newId for everything that was oldId OR null (for today's cluster items)
    const { error: deliveryError } = await supabase
        .from('deliveries')
        .update({
            status: 'ASSIGNED',
            assigned_user_id: newId,
            rejected_by_all: false,
            rejected_by_all_timestamp: null
        })
        .eq('date', '2026-02-05')
        .or(`assigned_user_id.eq.${oldId},status.eq.REJECTED`);

    if (deliveryError) console.error('Error updating deliveries:', deliveryError);
    else console.log('Rescued/Updated deliveries table');

    // 4. Update log_events table
    const { error: logError } = await supabase
        .from('log_events')
        .update({ actor_user_id: newId })
        .eq('actor_user_id', oldId);
    if (logError) console.error('Error updating log_events:', logError);
    else console.log('Updated log_events table');

    console.log('Migration complete');
}
run();

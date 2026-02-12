
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const oldId = 'bc268775-f79f-4400-b10b-bea4ba1dc762';
const newId = 'bc268775-f79f-440b-bea4ba1dc762';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`Flipping IDs for pavanmanne735@gmail.com: ${oldId} -> ${newId}`);

    // 1. Update users table (need to disable RLS/use service role)
    const { error: userError } = await supabase
        .from('users')
        .update({ id: newId })
        .eq('id', oldId);
    if (userError) console.error('Error updating users:', userError);
    else console.log('Updated users table');

    // 2. Update deliveries table
    const { error: deliveryError } = await supabase
        .from('deliveries')
        .update({ assigned_user_id: newId })
        .eq('assigned_user_id', oldId);
    if (deliveryError) console.error('Error updating deliveries:', deliveryError);
    else console.log('Updated deliveries table (assigned_user_id)');

    // 3. Update mappings table
    const { error: mappingError } = await supabase
        .from('mappings')
        .update({ photographer_id: newId })
        .eq('photographer_id', oldId);
    if (mappingError) console.error('Error updating mappings:', mappingError);
    else console.log('Updated mappings table');

    // 4. Update logs table
    const { error: logError } = await supabase
        .from('logs')
        .update({ actor_user_id: newId })
        .eq('actor_user_id', oldId);
    if (logError) console.error('Error updating logs:', logError);
    else console.log('Updated logs table');

    console.log('Migration complete');
}
run();

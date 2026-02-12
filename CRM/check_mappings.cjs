
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: mappings, error } = await supabase
        .from('mappings')
        .select('*');

    if (error) {
        console.error(error);
    } else {
        console.log(`MAPPINGS FOUND: ${mappings.length}`);
        mappings.forEach(m => {
            console.log(`- Showroom: ${m.dealership_id} | Photographer: ${m.photographer_id}`);
        });
    }
}
run();

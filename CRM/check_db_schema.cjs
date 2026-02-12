const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('Checking for screenshots table...');
    const { data, error } = await supabase.from('screenshots').select('*').limit(1);

    if (error) {
        console.error('Error selecting from screenshots:', error.message);
        if (error.code === '42P01') {
            console.log('Table "screenshots" does NOT exist.');
        }
    } else {
        console.log('Table "screenshots" exists. Sample data:', data);
    }
}

checkTables();

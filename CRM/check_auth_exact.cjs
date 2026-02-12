
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error(error);
    } else {
        const target = users.filter(u => u.email === 'pavanmanne735@gmail.com');
        console.log(`AUTH USERS FOR EMAIL: ${target.length}`);
        target.forEach(u => {
            console.log(`- [${u.id}] ${u.email}`);
        });
    }
}
run();

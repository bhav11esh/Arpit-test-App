const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const urlFromEnv = 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function main() {
    console.log('--- STARTING MIGRATION 019 EXECUTION ---');
    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '019_tuesday_carry_forward_triggers.sql');
    
    if (!fs.existsSync(sqlPath)) {
        console.error(`SQL file not found at ${sqlPath}`);
        return;
    }
    
    console.log(`Reading SQL from ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing SQL query via Supabase...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    } else {
        console.log('Migration completed successfully!', data);
        console.log('--- MIGRATION 019 COMPLETE ---');
    }
}

main().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});

const { createClient } = require('@supabase/supabase-js');

const urlFromEnv = 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function main() {
    console.log('--- STARTING CONSTRAINT UPDATE ---');
    const sql = `
      ALTER TABLE public.screenshots DROP CONSTRAINT IF EXISTS screenshots_type_check;

      ALTER TABLE public.screenshots ADD CONSTRAINT screenshots_type_check 
        CHECK (type IN ('PAYMENT', 'FOLLOW', 'RAPIDO', 'PLATFORM_PAYMENT', 'FRAUD_DETECTION', 'FRAUD_CALL_LOG'));
    `;
    
    console.log('Executing SQL query via Supabase exec_sql...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
        console.error('Update failed:', error.message);
        process.exit(1);
    } else {
        console.log('Constraint updated successfully!', data);
        console.log('--- CONSTRAINT UPDATE COMPLETE ---');
    }
}

main().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});

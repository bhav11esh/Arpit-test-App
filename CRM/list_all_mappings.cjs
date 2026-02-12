const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function listMappings() {
    console.log('--- Listing All Mappings ---');

    // Check 'mappings' table
    const { data: mappings, error } = await supabase
        .from('mappings')
        .select('*');

    if (error) {
        console.error('Error fetching mappings:', error.message);
        // Fallback to check if table exists or name is different
        return;
    }

    console.table(mappings);
}

listMappings();

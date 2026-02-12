const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debugAssignment() {
    console.log('--- Debugging Assignment for Apple Auto ---');

    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('assigned_user_id')
        .eq('showroom_code', 'APPLE_AUTO_VOLKSWAGEN');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const counts = {};
    deliveries.forEach(d => {
        const id = d.assigned_user_id || 'unassigned';
        counts[id] = (counts[id] || 0) + 1;
    });

    console.table(counts);

    // Get names for IDs
    const ids = Object.keys(counts).filter(id => id !== 'unassigned');
    if (ids.length > 0) {
        const { data: users } = await supabase.from('users').select('id, name').in('id', ids);
        users.forEach(u => console.log(`${u.id}: ${u.name}`));
    }
}

debugAssignment();

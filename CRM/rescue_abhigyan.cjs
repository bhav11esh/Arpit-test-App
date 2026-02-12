const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function rescueAbhigyan() {
    console.log('--- Rescuing Falsely Assigned Deliveries (Abhigyan) ---');

    // 1. Get Abhigyan's ID and Name
    const { data: user } = await supabase.from('users').select('*').ilike('name', 'Abhigyan').single();
    if (!user) { console.error('Abhigyan not found'); return; }
    console.log(`Target User: ${user.name} (${user.id})`);

    // 2. Find deliveries assigned to him from Import
    const { data: deliveries } = await supabase
        .from('deliveries')
        .select('*')
        .eq('assigned_user_id', user.id)
        .ilike('delivery_name', '%_IMPORT%');

    console.log(`Found ${deliveries.length} imported deliveries assigned to ${user.name}.`);

    const toRescue = deliveries.filter(d => {
        // If the delivery name DOES NOT contain "ABHIGYAN", it implies he wasn't the intended photographer
        // Logic: Valid import name: DATE_DEALERSHIP_ABHIGYAN_IMPORT
        // Invalid match import name: DATE_DEALERSHIP_IMPORT (empty name -> matched first user)
        return !d.delivery_name.toUpperCase().includes(user.name.toUpperCase());
    });

    console.log(`Identified ${toRescue.length} false assignments.`);
    toRescue.forEach(d => console.log(`[False] ${d.delivery_name}`));

    if (toRescue.length > 0) {
        const ids = toRescue.map(d => d.id);
        const { error, count } = await supabase
            .from('deliveries')
            .update({ assigned_user_id: null }) // Unassign
            .in('id', ids)
            .select('*', { count: 'exact' });

        if (error) console.error('Update failed:', error);
        else console.log(`✅ Unassigned ${count} records.`);
    }
}

rescueAbhigyan();

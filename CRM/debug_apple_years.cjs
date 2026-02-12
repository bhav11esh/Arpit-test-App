const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debugYearsAndSummary() {
    console.log('--- Debugging Years & Summary for Apple Auto ---');

    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('showroom_code', 'APPLE_AUTO_VOLKSWAGEN');

    if (error) { console.error(error); return; }

    console.log(`Total Records: ${deliveries.length}`);

    // Years Stats
    const years = {};
    deliveries.forEach(d => {
        const y = d.date.substring(0, 4);
        years[y] = (years[y] || 0) + 1;
    });
    console.log('Year Distribution:', years);

    // Assignment Stats (to debug "79" visibility)
    const assignments = {};
    deliveries.forEach(d => {
        const u = d.assigned_user_id || 'unassigned';
        assignments[u] = (assignments[u] || 0) + 1;
    });
    console.log('Assignments:', assignments);

    // Check Status
    const statuses = {};
    deliveries.forEach(d => {
        statuses[d.status] = (statuses[d.status] || 0) + 1;
    });
    console.log('Statuses:', statuses);
}

debugYearsAndSummary();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function countDeliveriesFeb6() {
    console.log('Checking deliveries for 2026-02-06...');

    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('date', '2026-02-06');

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Total Deliveries (Feb 6): ${deliveries.length}`);

    const statusCounts = {};
    deliveries.forEach(d => {
        statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
    });
    console.log('Status Breakdown:', JSON.stringify(statusCounts));

    // Check specific clusters (Aman is likely in Whitefield-Indiranagar)
    const whInUnassigned = deliveries.filter(d => d.cluster_code === 'Whitefield-Indiranagar' && d.status === 'UNASSIGNED');
    console.log(`Unassigned in Whitefield-Indiranagar: ${whInUnassigned.length}`);

    if (whInUnassigned.length > 0) {
        console.log('Unassigned Details:');
        whInUnassigned.forEach(d => console.log(`- ${d.delivery_name} [${d.timing}]`));
    } else {
        const whInTotal = deliveries.filter(d => d.cluster_code === 'Whitefield-Indiranagar').length;
        console.log(`Total in Whitefield-Indiranagar: ${whInTotal} (Assignments: ${whInTotal - whInUnassigned.length})`);
    }
}

countDeliveriesFeb6();

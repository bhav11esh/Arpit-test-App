const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function countDeliveries() {
    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('date', '2026-02-05');

    if (error) {
        console.error(error);
        return;
    }

    const assignedToAman = deliveries.filter(d => d.assigned_user_name === 'Aman Behera' || d.assigned_user_id === '8aa218f6-174b-449e-ba60-316584dc7d3d'); // Assuming ID from prev run or just generic check
    // Actually let's just count by status
    console.log(`Total Deliveries (Feb 5): ${deliveries.length}`);

    const statusCounts = {};
    deliveries.forEach(d => {
        statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
    });
    console.log('Status Breakdown:', JSON.stringify(statusCounts));

    // Check specific clusters
    const whInUnassigned = deliveries.filter(d => d.cluster_code === 'Whitefield-Indiranagar' && d.status === 'UNASSIGNED').length;
    console.log(`Unassigned in Whitefield-Indiranagar: ${whInUnassigned}`);

    const whInTotal = deliveries.filter(d => d.cluster_code === 'Whitefield-Indiranagar').length;
    console.log(`Total in Whitefield-Indiranagar: ${whInTotal}`);
}

countDeliveries();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debugSummary() {
    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('showroom_code', 'APPLE_AUTO_VOLKSWAGEN')
        .order('created_at', { ascending: false });

    if (error) { console.log(JSON.stringify(error)); return; }

    const stats = {
        total: deliveries.length,
        showroom_types: {},
        assignments: {},
        statuses: {},
        rejection: { rejected: 0, pending: 0, null: 0 },
        created_range: { start: null, end: null },
        date_range: { start: null, end: null }
    };

    if (deliveries.length > 0) {
        stats.created_range.start = deliveries[deliveries.length - 1].created_at;
        stats.created_range.end = deliveries[0].created_at;

        // Sort by date for date range
        const byDate = [...deliveries].sort((a, b) => a.date.localeCompare(b.date));
        stats.date_range.start = byDate[0].date;
        stats.date_range.end = byDate[byDate.length - 1].date;
    }

    deliveries.forEach(d => {
        // Showroom Type
        stats.showroom_types[d.showroom_type] = (stats.showroom_types[d.showroom_type] || 0) + 1;

        // Assignments
        const user = d.assigned_user_id || 'unassigned';
        stats.assignments[user] = (stats.assignments[user] || 0) + 1;

        // Status
        stats.statuses[d.status] = (stats.statuses[d.status] || 0) + 1;

        // Rejection
        if (d.rejected_by_all === true) stats.rejection.rejected++;
        else if (d.rejected_by_all === false) stats.rejection.pending++;
        else stats.rejection.null++;
    });

    console.log('___STATS_BEGIN___');
    console.log(JSON.stringify(stats, null, 2));
    console.log('___STATS_END___');
}

debugSummary();

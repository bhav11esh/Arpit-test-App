const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debugDateRange() {
    console.log('--- Debugging Date Range for Apple Auto ---');

    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('date')
        .eq('showroom_code', 'APPLE_AUTO_VOLKSWAGEN')
        .order('date', { ascending: true });

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (deliveries.length === 0) {
        console.log('No deliveries.');
        return;
    }

    console.log(`First Date: ${deliveries[0].date}`);
    console.log(`Last Date: ${deliveries[deliveries.length - 1].date}`);

    // Group by Month
    const months = {};
    deliveries.forEach(d => {
        const m = d.date.substring(0, 7); // YYYY-MM
        months[m] = (months[m] || 0) + 1;
    });

    console.table(months);
}

debugDateRange();

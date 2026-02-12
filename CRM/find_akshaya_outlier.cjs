require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findOutlier() {
    const { data, error } = await supabase
        .from('deliveries')
        .select('id, date, delivery_name')
        .ilike('delivery_name', '%Akshaya%')
        .eq('date', '2023-01-14'); // Suspected date from previous context

    if (data && data.length > 0) {
        console.log('🔥 FOUND OUTLIER (2023):');
        console.log(data);
    } else {
        // If not specific date, search for any 2023
        const { data: all } = await supabase
            .from('deliveries')
            .select('id, date, delivery_name')
            .ilike('delivery_name', '%Akshaya%')
            .lt('date', '2025-01-01');

        console.log('🔥 FOUND OUTLIER (< 2025):');
        console.log(all);
    }
}

findOutlier();

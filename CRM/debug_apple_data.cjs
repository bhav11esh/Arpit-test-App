require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAppleData() {
    const { data: allDeliveries } = await supabase
        .from('deliveries')
        .select('id, date, delivery_name')
        .ilike('delivery_name', '%Apple%');

    const outliers = allDeliveries.filter(d => !d.date.startsWith('2025') && !d.date.startsWith('2026'));

    if (outliers.length > 0) {
        outliers.forEach(d => console.log(`OUTLIER_FOUND: ID=${d.id} | Date=${d.date}`));
    } else {
        console.log("NO_OUTLIERS");
    }
}

checkAppleData();

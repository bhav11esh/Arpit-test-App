require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBharatData() {
    console.log('--- Checking Bharat Toyota Data ---');

    // 1. Find Dealership
    const { data: dealerships } = await supabase
        .from('dealerships')
        .select('id, name')
        .ilike('name', '%Bharat%Toyota%');

    if (!dealerships || dealerships.length === 0) {
        console.log('❌ Dealership not found!');
        return;
    }

    const dealership = dealerships[0];
    console.log(`✅ Found Dealership: ${dealership.name} (${dealership.id})`);

    // 2. Count Deliveries
    const { data: allDeliveries, error } = await supabase
        .from('deliveries')
        .select('id, date, delivery_name')
        .ilike('delivery_name', '%Bharat%')
        .order('date', { ascending: true });

    if (error) {
        console.error('Error fetching deliveries:', error);
        return;
    }

    console.log(`📊 Total Deliveries Found: ${allDeliveries.length}`);

    // 3. Check Years (Detailed Breakdown)
    const byYear = allDeliveries.reduce((acc, d) => {
        const y = d.date.substring(0, 4);
        acc[y] = (acc[y] || 0) + 1;
        return acc;
    }, {});
    console.log('📅 Breakdown by Year:', byYear);

    // 4. Highlight OUTLIERS (Anything not 2025 or 2026)
    const outliers = allDeliveries.filter(d => !d.date.startsWith('2025') && !d.date.startsWith('2026'));

    if (outliers.length > 0) {
        console.log("\n⚠️ FOUND OUTLIERS (Not 2025/2026):");
        outliers.forEach((d, index) => {
            console.log(`\n--- Outlier #${index + 1} ---`);
            console.log(`ID: ${d.id}`);
            console.log(`Date: "${d.date}"`);
            console.log(`Name: "${d.delivery_name}"`);
        });
    } else {
        console.log("\n✅ All rows are 2025 or 2026.");
    }
}

checkBharatData();

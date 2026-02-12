const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debugTargeted() {
    console.log('--- Targeted Debug: Bimal Nexa ---');

    // 1. Get Dealership
    const { data: dealership } = await supabase.from('dealerships').select('*').ilike('name', '%Bimal%').single();

    if (!dealership) {
        console.error('Bimal Nexa dealership not found!');
        return;
    }

    console.log(`Dealership Found: "${dealership.name}" (${dealership.id})`);

    // 2. Calculate Expected Code
    const parenthesisMatch = dealership.name.match(/\(([^)]+)\)/);
    const codeFromParens = parenthesisMatch ? parenthesisMatch[1] : null;
    const codeFromUpper = dealership.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const expectedCode = codeFromParens || codeFromUpper;

    console.log(`Expected Code: "${expectedCode}"`);

    // 3. Find Actual Deliveries
    // We search by name OR by the expected code to see what we find
    const oneDayAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48 hours to be safe

    const { data: deliveries } = await supabase
        .from('deliveries')
        .select('id, delivery_name, showroom_code')
        .gt('created_at', oneDayAgo)
        .ilike('delivery_name', '%BIMAL%')
        .limit(10);

    console.log(`\nFound ${deliveries.length} recent deliveries for Bimal:`);

    deliveries.forEach(d => {
        console.log(`[${d.delivery_name}] -> Showroom Code: "${d.showroom_code}"`);
        if (d.showroom_code !== expectedCode) {
            console.warn(`MISMATCH! Expected "${expectedCode}", Found "${d.showroom_code}"`);
        } else {
            console.log('MATCH!');
        }
    });

    // 4. Check Volkswagen too
    console.log('\n--- Targeted Debug: Volkswagen ---');
    const { data: volks } = await supabase.from('dealerships').select('*').ilike('name', '%Volk%').single();
    if (volks) {
        const vCode = volks.name.match(/\(([^)]+)\)/)?.[1] || volks.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        console.log(`Volks Expected: "${vCode}"`);

        const { data: vDeliveries } = await supabase
            .from('deliveries')
            .select('showroom_code')
            .ilike('delivery_name', '%VOLK%')
            .limit(5);

        vDeliveries.forEach(d => console.log(`Volks Delivery Code: "${d.showroom_code}"`));
    }

}

debugTargeted();

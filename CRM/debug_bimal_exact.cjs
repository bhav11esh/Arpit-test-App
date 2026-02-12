const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debugBimalExact() {
    console.log('--- Debugging Bimal/Volks Exact Names ---');

    console.log('\n[1] Dealerships in DB:');
    const { data: dealerships } = await supabase.from('dealerships').select('*').or('name.ilike.%Bimal%,name.ilike.%Volk%');

    dealerships.forEach(d => {
        console.log(`\nDealership: "${d.name}"`);
        console.log(`ID: ${d.id}`);

        // Emulate ViewScreen Logic EXACTLY
        const parenthesisMatch = d.name.match(/\(([^)]+)\)/);
        const codeFromParens = parenthesisMatch ? parenthesisMatch[1] : null;

        const codeFromUpper = d.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

        console.log(`Parens Match: ${codeFromParens ? `"${codeFromParens}"` : 'null'}`);
        console.log(`Upper Match:  "${codeFromUpper}"`);

        const finalExpected = codeFromParens || codeFromUpper;
        console.log(`EXPECTED Code in ViewScreen: "${finalExpected}"`);
    });

    console.log('\n[2] Actual Showroom Codes in Deliveries (Last 24h):');
    const { data: deliveries } = await supabase
        .from('deliveries')
        .select('showroom_code')
        .or('delivery_name.ilike.%BIMAL%,delivery_name.ilike.%VOLK%')
        .limit(10);

    // Uniqe codes
    const codes = [...new Set(deliveries.map(d => d.showroom_code))];
    console.log('Unique Codes Found:', codes);
}

debugBimalExact();

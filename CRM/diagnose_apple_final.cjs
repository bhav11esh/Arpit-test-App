
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function diagnoseAppleFinal() {
    console.log('--- FINDING APPLE AUTO CODE ---');

    // We know there are 569 records by name match.
    // We know ID '4e2d6e16-bb54-4071-9e75-bf55d37d6684' has 0.
    // Let's find what code IS being used.

    const { data: records, error } = await supabase
        .from('deliveries')
        .select('showroom_code')
        .ilike('delivery_name', '%Apple%')
        .limit(10); // Check first 10

    if (records && records.length > 0) {
        const code = records[0].showroom_code;
        console.log(`Found showroom_code: ${code}`);

        // Count records with this code
        const { count } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('showroom_code', code);
        console.log(`Total Count for ${code}: ${count}`);

        // Check for creation time batches
        const { data: recsByTime } = await supabase
            .from('deliveries')
            .select('date, delivery_name, created_at')
            .eq('showroom_code', code)
            .order('created_at', { ascending: false });

        console.log(`\nSort by Created At (Desc):`);
        console.log(`Most Recent: ${recsByTime[0].created_at}`);

        // Try to identify the "252" batch
        // Group by creation minute/hour
        const batches = {};
        recsByTime.forEach(r => {
            const t = r.created_at.substring(0, 16); // Up to minute: YYYY-MM-DDTHH:mm
            batches[t] = (batches[t] || 0) + 1;
        });
        console.log('Creation Batches:', JSON.stringify(batches, null, 2));

        // Print details of the most recent batch
        const latestTimePrefix = Object.keys(batches)[0];
        const latestBatch = recsByTime.filter(r => r.created_at.startsWith(latestTimePrefix));

        console.log(`\nDetails for Latest Batch (${latestBatch.length} records):`);
        // Sort by date to see range within this batch
        latestBatch.sort((a, b) => a.date.localeCompare(b.date));

        console.log(`First Date: ${latestBatch[0].date}`);
        console.log(`Last Date: ${latestBatch[latestBatch.length - 1].date}`);

        console.log('--- Last 10 records of Latest Batch ---');
        latestBatch.slice(-10).forEach((r, i) => console.log(`${latestBatch.length - 10 + i + 1}. ${r.date}`));
    } else {
        console.log('No records found by name.');
    }
}

diagnoseAppleFinal();

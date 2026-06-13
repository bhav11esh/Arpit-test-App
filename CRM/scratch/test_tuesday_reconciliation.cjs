const { createClient } = require('@supabase/supabase-js');

const urlFromEnv = 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function runTest() {
    console.log('--- STARTING TRIGGER VERIFICATION TEST ---');

    // 1. Check if column exists by querying leaves schema
    console.log('Checking if leaves table has converted_to_working_day column...');
    const { data: testLeaves, error: schemaError } = await supabase
        .from('leaves')
        .select('converted_to_working_day')
        .limit(1);

    if (schemaError) {
        console.error('Schema check failed! Make sure you ran the migration SQL in your Supabase Dashboard first.');
        console.error('Error details:', schemaError.message);
        process.exit(1);
    }
    console.log('✅ Success: converted_to_working_day column exists in database!');

    // 2. Create a test photographer user
    const testUserId = '00000000-0000-0000-0000-999999999999';
    console.log('\nCreating test photographer...');
    const { error: userError } = await supabase
        .from('users')
        .upsert({
            id: testUserId,
            email: 'test_tuesday_photographer@example.com',
            name: 'Test Tuesday Photographer',
            role: 'PHOTOGRAPHER',
            active: true
        });

    if (userError) {
        console.error('Failed to create test user:', userError.message);
        return;
    }
    console.log('✅ Test photographer created.');

    try {
        // 3. Insert two leaves in June 2026 (earliest: June 8, second: June 15)
        console.log('\nInserting leaves for June 2026...');
        const leavesData = [
            { photographer_id: testUserId, date: '2026-06-08', half: 'FIRST_HALF', applied_by: 'ADMIN' },
            { photographer_id: testUserId, date: '2026-06-08', half: 'SECOND_HALF', applied_by: 'ADMIN' },
            { photographer_id: testUserId, date: '2026-06-15', half: 'FIRST_HALF', applied_by: 'ADMIN' },
            { photographer_id: testUserId, date: '2026-06-15', half: 'SECOND_HALF', applied_by: 'ADMIN' }
        ];

        const { error: leavesError } = await supabase
            .from('leaves')
            .insert(leavesData);

        if (leavesError) {
            throw new Error(`Failed to insert leaves: ${leavesError.message}`);
        }
        console.log('✅ Leaves created (June 8 and June 15).');

        // 4. Insert a delivery on a Tuesday (June 9, 2026 is Tuesday)
        const testDeliveryId = '00000000-0000-0000-0000-888888888888';
        console.log('\nInserting a delivery on Tuesday (June 9, 2026)...');
        const { error: delError } = await supabase
            .from('deliveries')
            .insert({
                id: testDeliveryId,
                date: '2026-06-09',
                showroom_code: 'TEST_SHOWROOM',
                cluster_code: 'TEST_CLUSTER',
                showroom_type: 'PRIMARY',
                delivery_name: '09-06-2026_TEST_SHOWROOM',
                status: 'ASSIGNED',
                assigned_user_id: testUserId,
                payment_type: 'CUSTOMER_PAID'
            });

        if (delError) {
            throw new Error(`Failed to insert delivery: ${delError.message}`);
        }
        console.log('✅ Tuesday delivery inserted (Status: ASSIGNED).');

        // 5. Update the delivery status to DONE
        console.log('\nMarking Tuesday delivery as DONE...');
        const { error: updateError } = await supabase
            .from('deliveries')
            .update({ status: 'DONE' })
            .eq('id', testDeliveryId);

        if (updateError) {
            throw new Error(`Failed to update delivery to DONE: ${updateError.message}`);
        }
        console.log('✅ Tuesday delivery marked as DONE.');

        // 6. Fetch leaves and check if June 8 (earliest) is converted
        console.log('\nFetching leaves from database to verify trigger conversion...');
        const { data: leavesAfterReconciliation, error: fetchErr } = await supabase
            .from('leaves')
            .select('date, half, converted_to_working_day')
            .eq('photographer_id', testUserId)
            .order('date', { ascending: true });

        if (fetchErr) {
            throw new Error(`Failed to fetch leaves: ${fetchErr.message}`);
        }

        console.log('Current leave states in June 2026:');
        leavesAfterReconciliation.forEach(l => {
            console.log(`- Date: ${l.date} | Half: ${l.half} | Converted: ${l.converted_to_working_day}`);
        });

        // June 8 should be converted (TRUE)
        const june8Leaves = leavesAfterReconciliation.filter(l => l.date === '2026-06-08');
        const june15Leaves = leavesAfterReconciliation.filter(l => l.date === '2026-06-15');

        const allJune8Converted = june8Leaves.every(l => l.converted_to_working_day === true);
        const allJune15Normal = june15Leaves.every(l => l.converted_to_working_day === false);

        if (allJune8Converted && allJune15Normal) {
            console.log('\n🎉 TEST PASSED! The earliest leave (June 8) was automatically converted to a working day, and subsequent leaves (June 15) remained normal.');
        } else {
            console.error('\n❌ TEST FAILED: Leave conversion flags do not match expected states!');
        }

        // 7. Verify SEND_UPDATE_COMPLETED log was inserted for June 8
        console.log('\nVerifying SEND_UPDATE_COMPLETED log exists for June 8...');
        const { data: logs, error: logsError } = await supabase
            .from('log_events')
            .select('id, type, metadata')
            .eq('actor_user_id', testUserId)
            .eq('type', 'SEND_UPDATE_COMPLETED');

        if (logsError) {
            console.error('Failed to query logs:', logsError.message);
        } else {
            console.log(`Found ${logs.length} SEND_UPDATE_COMPLETED logs for test photographer.`);
            logs.forEach(lg => {
                console.log(`- Log ID: ${lg.id} | Metadata: ${JSON.stringify(lg.metadata)}`);
            });
        }

    } finally {
        // Clean up test data
        console.log('\n--- CLEANING UP TEST DATA ---');
        
        console.log('Deleting test log events...');
        await supabase.from('log_events').delete().eq('actor_user_id', testUserId);

        console.log('Deleting test leaves...');
        await supabase.from('leaves').delete().eq('photographer_id', testUserId);

        console.log('Deleting test delivery...');
        await supabase.from('deliveries').delete().eq('id', '00000000-0000-0000-0000-888888888888');

        console.log('Deleting test user...');
        await supabase.from('users').delete().eq('id', testUserId);

        console.log('Cleanup complete.');
    }
}

runTest().catch(console.error);

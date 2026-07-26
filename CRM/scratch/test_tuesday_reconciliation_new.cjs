const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: 'C:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const urlFromEnv = process.env.VITE_SUPABASE_URL || 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!keyFromEnv) {
    console.error('Error: VITE_SUPABASE_SERVICE_ROLE_KEY is missing from environment.');
    process.exit(1);
}

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function runTest() {
    console.log('--- STARTING NEW TUESDAY RECONCILIATION VERIFICATION ---');

    const testUserId = '00000000-0000-0000-0000-777777777777';
    const deliveryId1 = '00000000-0000-0000-0000-111111111111';
    const deliveryId2 = '00000000-0000-0000-0000-222222222222';
    const deliveryId3 = '00000000-0000-0000-0000-333333333333';

    try {
        // 1. Clean up any stale test data first
        await cleanUp(testUserId, [deliveryId1, deliveryId2, deliveryId3]);

        // 2. Create test photographer
        console.log('\nCreating test photographer...');
        const { error: userError } = await supabase
            .from('users')
            .upsert({
                id: testUserId,
                email: 'test_tuesday_photographer_new@example.com',
                name: 'Test Tuesday Photographer New',
                role: 'PHOTOGRAPHER',
                active: true
            });
        if (userError) throw new Error(`User creation failed: ${userError.message}`);
        console.log('✅ Photographer created.');

        // 3. Create leaves in the past relative to June 10, 2026: 
        // June 4, 2026 (Thursday): Full Day (FIRST_HALF & SECOND_HALF)
        // June 5, 2026 (Friday): Half Day (FIRST_HALF)
        console.log('\nInserting leaves (June 4 Full Day, June 5 Half Day)...');
        const { error: leavesError } = await supabase
            .from('leaves')
            .insert([
                { photographer_id: testUserId, date: '2026-06-04', half: 'FIRST_HALF', applied_by: 'ADMIN' },
                { photographer_id: testUserId, date: '2026-06-04', half: 'SECOND_HALF', applied_by: 'ADMIN' },
                { photographer_id: testUserId, date: '2026-06-05', half: 'FIRST_HALF', applied_by: 'ADMIN' }
            ]);
        if (leavesError) throw new Error(`Leaves insertion failed: ${leavesError.message}`);
        console.log('✅ Leaves inserted.');

        // 4. Test Case 1: 1 delivery on Tuesday (June 2, 2026 is Tuesday)
        // Expected: 1 credit earned. Converted: June 4 FIRST_HALF only.
        console.log('\n--- TEST CASE 1: 1 Tuesday delivery (June 2) ---');
        console.log('Inserting 1 completed Tuesday delivery...');
        await insertDoneDelivery(deliveryId1, '2026-06-02', testUserId);
        
        await reconcile(testUserId, '2026-06-01');
        
        let leaves = await fetchLeaves(testUserId);
        printLeaves(leaves);
        
        verifyLeaveConverted(leaves, '2026-06-04', 'FIRST_HALF', true);
        verifyLeaveConverted(leaves, '2026-06-04', 'SECOND_HALF', false);
        verifyLeaveConverted(leaves, '2026-06-05', 'FIRST_HALF', false);
        console.log('✅ TEST CASE 1 PASSED: Exactly 0.5-day carry-forward occurred.');

        // 5. Test Case 2: 2 deliveries on Tuesday (June 9, 2026 is Tuesday)
        // Total credits earned: 1 (June 2) + 2 (June 9) = 3 credits.
        // Expected converted: June 4 FIRST_HALF, June 4 SECOND_HALF, June 5 FIRST_HALF (All converted).
        console.log('\n--- TEST CASE 2: Add 2 Tuesday deliveries (June 9) ---');
        console.log('Inserting 2 completed Tuesday deliveries on June 9...');
        await insertDoneDelivery(deliveryId2, '2026-06-09', testUserId);
        await insertDoneDelivery(deliveryId3, '2026-06-09', testUserId);
        
        await reconcile(testUserId, '2026-06-01');
        
        leaves = await fetchLeaves(testUserId);
        printLeaves(leaves);
        
        verifyLeaveConverted(leaves, '2026-06-04', 'FIRST_HALF', true);
        verifyLeaveConverted(leaves, '2026-06-04', 'SECOND_HALF', true);
        verifyLeaveConverted(leaves, '2026-06-05', 'FIRST_HALF', true);
        console.log('✅ TEST CASE 2 PASSED: Exactly 1.5-day carry-forward occurred.');

        // 6. Test Case 3: Delete the June 2 Tuesday delivery
        // Total credits earned: 0 (June 2) + 2 (June 9) = 2 credits.
        // Expected converted: June 4 FIRST_HALF, June 4 SECOND_HALF. June 5 FIRST_HALF is FALSE.
        console.log('\n--- TEST CASE 3: Delete June 2 Tuesday delivery ---');
        await deleteDelivery(deliveryId1);
        
        await reconcile(testUserId, '2026-06-01');
        
        leaves = await fetchLeaves(testUserId);
        printLeaves(leaves);
        
        verifyLeaveConverted(leaves, '2026-06-04', 'FIRST_HALF', true);
        verifyLeaveConverted(leaves, '2026-06-04', 'SECOND_HALF', true);
        verifyLeaveConverted(leaves, '2026-06-05', 'FIRST_HALF', false);
        console.log('✅ TEST CASE 3 PASSED: Exactly 1.0-day carry-forward occurred.');

        // 7. Test Case 4: Verify Missing Update Penalties
        // June 4: Originally a Full-Day leave (2 rows). Expected: Exempt from missing update.
        // June 5: Originally a Half-Day leave (1 row). Expected: NOT exempt (shows as missing update if no update sent).
        console.log('\n--- TEST CASE 4: Verify Missing Update Exemption ---');
        const { data: missingUpdates, error: rpcError } = await supabase.rpc('get_photographer_missing_updates', {
            p_photographer_id: testUserId,
            p_start_date: '2026-06-01',
            p_end_date: '2026-06-30'
        });
        if (rpcError) throw rpcError;
        
        const missingDates = (missingUpdates || []).map(mu => mu.missing_date);
        console.log('Missing update dates returned for test photographer:', missingDates);
        
        const hasJune4 = missingDates.includes('2026-06-04');
        const hasJune5 = missingDates.includes('2026-06-05');
        
        console.log(`June 4 is in missing updates list: ${hasJune4} (Expected: false)`);
        console.log(`June 5 is in missing updates list: ${hasJune5} (Expected: true)`);
        
        if (hasJune4) {
            throw new Error('Failure: June 4 (originally full-day leave) was not exempt from missing updates!');
        }
        if (!hasJune5) {
            throw new Error('Failure: June 5 (originally half-day leave) was incorrectly marked as exempt!');
        }
        console.log('✅ TEST CASE 4 PASSED: Penalty rules are correctly applied.');

    } finally {
        console.log('\n--- CLEANING UP ---');
        await cleanUp(testUserId, [deliveryId1, deliveryId2, deliveryId3]);
        console.log('✅ Cleanup finished.');
    }
}

async function insertDoneDelivery(id, date, userId) {
    const { error } = await supabase
        .from('deliveries')
        .insert({
            id,
            date,
            showroom_code: 'TEST_SHOWROOM',
            cluster_code: 'TEST_CLUSTER',
            showroom_type: 'PRIMARY',
            delivery_name: `${date}_TEST_SHOWROOM`,
            status: 'DONE',
            assigned_user_id: userId,
            payment_type: 'CUSTOMER_PAID'
        });
    if (error) throw error;
}

async function deleteDelivery(id) {
    const { error } = await supabase
        .from('deliveries')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

async function fetchLeaves(userId) {
    const { data, error } = await supabase
        .from('leaves')
        .select('date, half, converted_to_working_day')
        .eq('photographer_id', userId)
        .order('date', { ascending: true })
        .order('half', { ascending: true });
    if (error) throw error;
    return data;
}

function printLeaves(leaves) {
    console.log('Current Leaves:');
    leaves.forEach(l => {
        console.log(`  - Date: ${l.date} | Half: ${l.half} | Converted: ${l.converted_to_working_day}`);
    });
}

function verifyLeaveConverted(leaves, date, half, expected) {
    const l = leaves.find(x => x.date === date && x.half === half);
    if (!l) throw new Error(`Leave not found for ${date} ${half}`);
    if (l.converted_to_working_day !== expected) {
        throw new Error(`Assertion failed for ${date} ${half}: expected converted to be ${expected}, got ${l.converted_to_working_day}`);
    }
}

async function reconcile(userId, dateStr) {
    const { error } = await supabase.rpc('reconcile_photographer_tuesday_leaves', {
        p_photographer_id: userId,
        p_month_date: dateStr
    });
    if (error) throw error;
}

async function cleanUp(userId, deliveryIds) {
    await supabase.from('leaves').delete().eq('photographer_id', userId);
    await supabase.from('deliveries').delete().in('id', deliveryIds);
    await supabase.from('users').delete().eq('id', userId);
}

runTest().catch(err => {
    console.error('\n❌ TEST RUN FAILED:', err.message);
    process.exit(1);
});

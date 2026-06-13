const { createClient } = require('@supabase/supabase-js');

const urlFromEnv = 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function fixMayPenalties() {
    console.log('--- STARTING MAY PENALTIES FIX ---');
    
    // Tuesdays in May 2026
    const mayTuesdays = ['2026-05-05', '2026-05-12', '2026-05-19', '2026-05-26'];
    
    // 1. Get all active photographers
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'PHOTOGRAPHER')
        .eq('active', true);
        
    if (userError) {
        console.error('Error fetching users:', userError);
        return;
    }
    console.log(`Found ${users.length} active photographers.`);

    // --- STEP 1: Undo send update penalisation for Tuesdays in May ---
    console.log('\n--- STEP 1: Undoing Tuesday missing update penalties ---');
    for (const tDay of mayTuesdays) {
        for (const user of users) {
            // Check if log exists
            const startOfDay = `${tDay}T00:00:00Z`;
            const endOfDay = `${tDay}T23:59:59Z`;
            
            const { data: existingLog } = await supabase
                .from('log_events')
                .select('id')
                .eq('actor_user_id', user.id)
                .eq('type', 'SEND_UPDATE_COMPLETED')
                .gte('created_at', startOfDay)
                .lte('created_at', endOfDay);
                
            if (!existingLog || existingLog.length === 0) {
                // Insert missing log
                await supabase.from('log_events').insert({
                    type: 'SEND_UPDATE_COMPLETED',
                    actor_user_id: user.id,
                    target_id: 'SYSTEM_FIX',
                    metadata: { reason: 'fixed_tuesday_penalty' },
                    created_at: `${tDay}T18:00:00Z` // 18:00 UTC
                });
                console.log(`Added missing SEND_UPDATE_COMPLETED for ${user.name} on ${tDay}`);
            }
        }
    }
    
    // --- STEP 2: Convert first unpaid leave for those who worked on a Tuesday in May ---
    console.log('\n--- STEP 2: Converting first unpaid leave for Tuesday workers ---');
    
    // Find who worked on a Tuesday in May
    const { data: deliveries, error: delError } = await supabase
        .from('deliveries')
        .select('assigned_user_id')
        .eq('status', 'DONE')
        .in('date', mayTuesdays)
        .not('assigned_user_id', 'is', null);
        
    if (delError) {
        console.error('Error fetching deliveries:', delError);
        return;
    }
    
    // Get unique photographer IDs who worked on any of those Tuesdays
    const workedOnTuesdayIds = [...new Set(deliveries.map(d => d.assigned_user_id))];
    console.log(`Found ${workedOnTuesdayIds.length} photographers who worked on a Tuesday in May.`);
    
    for (const userId of workedOnTuesdayIds) {
        const user = users.find(u => u.id === userId);
        const userName = user ? user.name : userId;
        
        // Find their leaves in May, order by date ascending to get the earliest
        const { data: leaves, error: leaveErr } = await supabase
            .from('leaves')
            .select('date')
            .eq('photographer_id', userId)
            .gte('date', '2026-05-01')
            .lte('date', '2026-05-31')
            .order('date', { ascending: true });
            
        if (leaveErr) {
            console.error(`Error fetching leaves for ${userName}:`, leaveErr);
            continue;
        }
        
        if (leaves && leaves.length > 0) {
            const firstLeaveDate = leaves[0].date;
            console.log(`Photographer ${userName} worked on a Tuesday. First leave in May is ${firstLeaveDate}. Converting...`);
            
            // Delete ALL leave records for that exact date (FIRST_HALF and SECOND_HALF)
            const { error: delLeaveErr } = await supabase
                .from('leaves')
                .delete()
                .eq('photographer_id', userId)
                .eq('date', firstLeaveDate);
                
            if (delLeaveErr) {
                console.error(`Failed to delete leave for ${userName} on ${firstLeaveDate}:`, delLeaveErr);
            } else {
                console.log(`Deleted leave records for ${userName} on ${firstLeaveDate}`);
                
                // Ensure they have a SEND_UPDATE_COMPLETED for that converted day so they aren't penalized
                const startOfLeaveDay = `${firstLeaveDate}T00:00:00Z`;
                const endOfLeaveDay = `${firstLeaveDate}T23:59:59Z`;
                
                const { data: checkLog } = await supabase
                    .from('log_events')
                    .select('id')
                    .eq('actor_user_id', userId)
                    .eq('type', 'SEND_UPDATE_COMPLETED')
                    .gte('created_at', startOfLeaveDay)
                    .lte('created_at', endOfLeaveDay);
                    
                if (!checkLog || checkLog.length === 0) {
                    await supabase.from('log_events').insert({
                        type: 'SEND_UPDATE_COMPLETED',
                        actor_user_id: userId,
                        target_id: 'SYSTEM_FIX_CONVERTED_LEAVE',
                        metadata: { reason: 'converted_first_may_leave_no_penalty' },
                        created_at: `${firstLeaveDate}T18:00:00Z`
                    });
                    console.log(`Added missing SEND_UPDATE_COMPLETED for ${userName} on converted leave day ${firstLeaveDate}`);
                }
            }
        } else {
            console.log(`Photographer ${userName} worked on a Tuesday but had no leaves in May to convert.`);
        }
    }
    
    console.log('\n--- MAY PENALTIES FIX COMPLETE ---');
}

fixMayPenalties();

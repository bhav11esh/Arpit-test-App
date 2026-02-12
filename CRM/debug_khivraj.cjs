
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Hardcoded credentials for debugging
const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTQyNTIsImV4cCI6MjA4NTAzMDI1Mn0.OOzU01pM2q71k_vpCK7pfXBNiDnhDalg6q2cFr-lgBQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Checking Khivraj Delivery ---');
    // 1. Find the delivery
    const { data: deliveries, error: dErr } = await supabase
        .from('deliveries')
        .select('*')
        .ilike('delivery_name', '%Khivraj%')
        .order('created_at', { ascending: false })
        .limit(5);

    if (dErr) {
        console.error('Error fetching delivery:', dErr);
        return;
    }

    if (!deliveries || deliveries.length === 0) {
        console.log('No Khivraj delivery found.');
        return;
    }

    const d = deliveries[0];
    console.log('Found Delivery:', {
        id: d.id,
        name: d.delivery_name,
        showroom: d.showroom_code,
        cluster: d.cluster_code,
        status: d.status,
        timing: d.timing,
        date: d.date,
        rejected_by_all: d.rejected_by_all,
        assigned_user_id: d.assigned_user_id
    });

    // 2. Check rejections
    console.log('\n--- Checking Rejections ---');
    const { data: rejections, error: rErr } = await supabase
        .from('delivery_rejections')
        .select('*')
        .eq('delivery_id', d.id);

    if (rErr) console.error('Error fetching rejections:', rErr);
    else console.log('Rejections:', rejections);

    // 3. Check Active Users in Cluster
    console.log('\n--- Checking Active Users in Cluster: ' + d.cluster_code + ' ---');
    const { data: users, error: uErr } = await supabase
        .from('users')
        .select('id, email, name, active, cluster_code')
        .eq('cluster_code', d.cluster_code)
        .eq('active', true);

    if (uErr) console.error('Error fetching users:', uErr);
    else {
        console.log('Active Users:', users);
        const userIds = users.map(u => u.id);
        const rejectedIds = rejections.map(r => r.user_id);
        const allRejected = userIds.every(id => rejectedIds.includes(id));
        console.log(`\nAll Active Users Rejected? ${allRejected} (Active: ${userIds.length}, Rejected: ${rejectedIds.length})`);
    }
}

check();

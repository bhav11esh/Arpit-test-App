const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findUsersAndLeaves() {
    // 1. Find the photographers
    const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .ilike('name', '%Mallikarjun%');

    const { data: users2, error: userError2 } = await supabase
        .from('profiles')
        .select('id, name, email')
        .ilike('name', '%Aman%');

    const allUsers = [...(users || []), ...(users2 || [])];
    console.log('Photographers Found:', JSON.stringify(allUsers, null, 2));

    if (allUsers.length === 0) return;

    const ids = allUsers.map(u => u.id);

    // 2. Find leaves
    const { data: leaves, error: leaveError } = await supabase
        .from('leaves')
        .select('*')
        .in('photographer_id', ids)
        .order('date', { ascending: false });

    console.log('Leaves Found:', JSON.stringify(leaves, null, 2));
}

findUsersAndLeaves();

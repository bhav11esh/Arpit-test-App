const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeaves() {
    const { data, error } = await supabase
        .from('leaves')
        .select('*')
        .limit(50);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Total Leaves found:', data.length);
    console.log(JSON.stringify(data, null, 2));
}

checkLeaves();

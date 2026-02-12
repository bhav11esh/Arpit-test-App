const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSahith() {
    console.log('--- Checking Sahith ---');

    // 1. Search by name "Sahith"
    const { data: usersByName, error: nameError } = await adminSupabase
        .from('users')
        .select('*')
        .ilike('name', '%sahith%'); // Broad search

    if (nameError) {
        console.error('Error searching by name:', nameError);
    } else {
        console.log('Users found by name "sahith":');
        console.dir(usersByName, { depth: null });
    }

    // 2. Search by email "sahithundru@gmail.com" (explicit check)
    const email = 'sahithundru@gmail.com'; // Guessing from context, or "sahith..."
    const { data: usersByEmail, error: emailError } = await adminSupabase
        .from('users')
        .select('*')
        .ilike('email', `%${email}%`);

    if (emailError) {
        console.error('Error:', emailError);
    } else {
        console.log('--- RESULT ---');
        console.log(JSON.stringify(usersByEmail, null, 2));
    }
}

checkSahith();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse the .env.local because dotenv might be tricky here
const envPath = path.join(__dirname, 'CRM', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim().replace(/"/g, '');
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);
console.log('Anon Key ends with:', anonKey.slice(-10));

const supabase = createClient(supabaseUrl, anonKey);

async function check() {
    const tables = ['clusters', 'dealerships', 'users', 'mappings'];
    for (const table of tables) {
        try {
            const { data, count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact' });

            if (error) {
                console.error(`Error ${table}:`, error.message, error.code);
            } else {
                console.log(`${table}: ${count} rows`);
                if (data && data.length > 0) {
                    console.log(`First row of ${table}:`, data[0].name || data[0].id);
                }
            }
        } catch (e) {
            console.error(`Failed ${table}:`, e.message);
        }
    }
}

check();

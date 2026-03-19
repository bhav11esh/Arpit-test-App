const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findAbhigyan() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('name', '%Abhigyan%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Abhigyan Record:', JSON.stringify(data, null, 2));
}

findAbhigyan();

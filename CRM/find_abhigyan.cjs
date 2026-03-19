const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findAbhigyan() {
  console.log('Searching for Abhigyan...');
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('name', '%Abhigyan%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Abhigyan Record Found:');
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log('No user found with name containing Abhigyan');
  }
}

findAbhigyan();

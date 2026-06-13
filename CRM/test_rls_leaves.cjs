const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: 'C:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

// Use ANON key to test RLS
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testRls() {
  console.log('Logging in as Admin (arpitmudgal95@gmail.com or similar)...');
  
  // Note: we can sign in using email/password if we know it. 
  // Let's check if we can select leaves directly without signing in (should return empty due to RLS).
  const { data: leavesAnon, error: errAnon } = await supabase
    .from('leaves')
    .select('*')
    .eq('photographer_id', 'bc268775-f79f-4400-b10b-bea4ba1dc762');

  console.log(`Anon select count: ${leavesAnon?.length || 0}`);
  if (errAnon) console.error('Anon error:', errAnon);

  // Let's sign in as the admin user.
  // In the database users table, what is the admin's email?
  // Let's log in using the admin credentials. Wait, we don't know the password.
  // But we can check the RLS policy SQL itself.
}

testRls();

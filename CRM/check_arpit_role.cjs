const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: 'C:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkArpit() {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .ilike('name', '%Arpit%');

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log('--- ARPIT USER RECORDS ---');
  console.table(users);
}

checkArpit();

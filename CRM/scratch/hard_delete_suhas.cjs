const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function hardDelete() {
  console.log('Deleting Suhas...');
  
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('email', 'iamgsuhas@gmail.com');
    
  if (error) {
    console.error('Error deleting user:', error);
  } else {
    console.log('Successfully hard deleted user with email iamgsuhas@gmail.com');
  }
}

hardDelete();

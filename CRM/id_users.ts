import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function idUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', ['bc268775-f79f-4400-b10b-bea4ba1dc762', '23fb8d28-08e9-4e87-8a77-6e2b3324b872']);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('User IDs check:');
  console.table(data);
}

idUsers();

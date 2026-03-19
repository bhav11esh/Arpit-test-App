import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function findArpit() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('email', 'arpitmudgal24@gmail.com');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Arpit check:');
  console.table(data);
}

findArpit();

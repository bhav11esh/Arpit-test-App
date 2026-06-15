import { supabase } from './src/app/lib/supabase';

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

import { supabase } from './src/app/lib/supabase';

async function check() {
  const userId = 'bc268775-f79f-4400-b10b-bea4ba1dc762'; // Mallikarjun
  console.log('Checking reel tasks for user:', userId);

  const { data, error } = await supabase
    .from('reel_tasks')
    .select('*, deliveries(*)')
    .eq('assigned_user_id', userId)
    .eq('status', 'PENDING');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data?.length} pending reel tasks.`);
  data?.forEach(r => {
    console.log(`- Reel ID: ${r.id}, Delivery Date: ${r.deliveries?.date}, Status: ${r.status}`);
  });
}

check();

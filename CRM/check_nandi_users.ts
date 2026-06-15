import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function checkNandiUsers() {
  const { data, error } = await supabase
    .from('deliveries')
    .select('id, showroom_code, assigned_user_id')
    .or('showroom_code.eq.NANDI_TOYOTA,showroom_code.eq.Nandi toyota');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const userCounts: Record<string, number> = {};
  data.forEach(d => {
    const uid = d.assigned_user_id || 'NULL';
    userCounts[uid] = (userCounts[uid] || 0) + 1;
  });

  console.log('User counts for Nandi Toyota deliveries:');
  console.table(Object.entries(userCounts).map(([uid, count]) => ({ assigned_user_id: uid, count })));
}

checkNandiUsers();

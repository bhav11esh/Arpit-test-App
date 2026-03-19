import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function fetchUsers() {
  console.log('Fetching user profiles...');
  const { data, error } = await supabase
    .from('users')
    .select('id, name');

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  const userMap = {};
  data.forEach(u => {
    userMap[u.id] = u.name;
  });

  fs.writeFileSync('user_map.json', JSON.stringify(userMap, null, 2));
  console.log(`Successfully mapped ${data.length} users.`);
}

fetchUsers();

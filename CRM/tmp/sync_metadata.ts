import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function migrate() {
  console.log('Starting metadata migration...');

  // 1. Get all photographers and clusters
  const { data: users } = await supabase.from('users').select('*').eq('role', 'PHOTOGRAPHER');
  const { data: clusters } = await supabase.from('clusters').select('*');
  const { data: mappings } = await supabase.from('mappings').select('*').eq('mapping_type', 'PRIMARY');

  if (!users || !clusters || !mappings) {
    console.error('Failed to fetch data');
    return;
  }

  for (const user of users) {
    // Find primary cluster name
    const primaryMapping = mappings.find(m => m.photographer_id === user.id);
    const cluster = clusters.find(c => c.id === primaryMapping?.cluster_id || c.id === user.cluster_code);
    
    const metadata = {
      name: user.name,
      role: 'PHOTOGRAPHER',
      city: user.city || 'bengaluru',
      cluster_code: cluster?.name || ''
    };

    console.log(`Syncing ${user.email}:`, metadata);

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: metadata
    });

    if (error) {
      console.error(`Failed to sync ${user.email}:`, error.message);
    }
  }

  console.log('Migration complete.');
}

migrate();

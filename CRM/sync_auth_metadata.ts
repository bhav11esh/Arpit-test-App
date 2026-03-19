
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase Service Role Key or URL');
    process.exit(1);
}

// Use Service Role Key to bypass RLS and use Admin API
const supabaseAdm = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function syncMetadata() {
    console.log('🔄 Syncing Auth Metadata with Database Roles...');

    // 1. Get all users from public.users table
    const { data: dbUsers, error: dbError } = await supabaseAdm
        .from('users')
        .select('id, email, role, city');

    if (dbError) {
        console.error('❌ Error fetching DB users:', dbError.message);
        return;
    }

    console.log(`Found ${dbUsers.length} users in database.`);

    for (const user of dbUsers) {
        console.log(`Processing ${user.email} (${user.role})...`);
        
        // 2. Update Auth Metadata for this user
        const { error: authError } = await supabaseAdm.auth.admin.updateUserById(user.id, {
            user_metadata: {
                role: user.role,
                city: user.city || 'bengaluru'
            }
        });

        if (authError) {
            console.error(`❌ Failed to update auth metadata for ${user.email}:`, authError.message);
        } else {
            console.log(`✅ Updated auth metadata for ${user.email}`);
        }
    }

    console.log('✨ Metadata sync complete.');
}

syncMetadata();

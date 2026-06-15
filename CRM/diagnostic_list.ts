import { adminSupabase } from './src/app/lib/supabase';

async function listTables() {
    console.log('Listing all tables in public schema...');
    if (!adminSupabase) {
        console.error('Admin Supabase client not initialized.');
        return;
    }

    try {
        // Querying the information_schema to see actual table names
        const { data, error } = await adminSupabase.rpc('get_tables');

        if (error) {
            console.log('RPC get_tables failed, trying direct select from pg_tables...');
            const { data: data2, error: error2 } = await adminSupabase
                .from('pg_tables')
                .select('tablename')
                .eq('schemaname', 'public');

            if (error2) {
                console.error('Error listing tables from pg_tables:', error2);
                console.log('Trying a simple query to live_bookings (underscore)');
                const { error: e1 } = await adminSupabase.from('live_bookings').select('*').limit(1);
                console.log('Underscore error:', e1?.message);

                console.log('Trying a simple query to live bookings (space)');
                const { error: e2 } = await adminSupabase.from('live bookings').select('*').limit(1);
                console.log('Space error:', e2?.message);
            } else {
                console.log('Tables found in pg_tables:', data2);
            }
        } else {
            console.log('Tables found via RPC:', data);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

listTables();

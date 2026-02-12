
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    const log = (msg) => console.log(msg);

    try {
        const envPath = path.join(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const lineSplit = line.split('=');
            if (lineSplit.length > 1) {
                env[lineSplit[0].trim()] = lineSplit.slice(1).join('=').trim().replace(/"/g, '');
            }
        });

        const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);

        // Find mappings with NULL photographer_id
        const { data: nullMappings, error } = await client.from('mappings')
            .select('*')
            .is('photographer_id', null);

        if (nullMappings && nullMappings.length > 0) {
            log(`FOUND ${nullMappings.length} mappings with NULL photographer_id. Deleting...`);

            for (const m of nullMappings) {
                const { error: delErr } = await client.from('mappings').delete().eq('id', m.id);
                if (delErr) log(`Failed to delete mapping ${m.id}: ${delErr.message}`);
                else log(`Deleted mapping ${m.id}`);
            }
        } else {
            log('No mappings with NULL photographer_id found.');
        }

        // Also check for users that don't exist in auth (ghosts)
        // This is expensive to check all, so we skip for now unless needed.
        // The previous script showed "ID: null" which implies photographer_id IS null in the DB.

    } catch (e) {
        log('ERR: ' + e.message);
    }
}

run();

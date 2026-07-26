const { createClient } = require('@supabase/supabase-js');

const urlFromEnv = 'https://amikduuczgnirbnzuvtc.supabase.co';
const keyFromEnv = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(urlFromEnv, keyFromEnv, { auth: { persistSession: false } });

async function restoreLeaves() {
    const usersToRestore = [
        { name: 'Akhil', date: '2026-05-03' },
        { name: 'Mallikarjun', date: '2026-05-02' },
        { name: 'Sahil Tamang', date: '2026-05-11' }
    ];

    const { data: allUsers } = await supabase.from('users').select('id, name');

    for (const u of usersToRestore) {
        const userRec = allUsers.find(x => x.name === u.name);
        if (userRec) {
            console.log(`Restoring leaves for ${u.name} on ${u.date}`);
            await supabase.from('leaves').insert([
                { photographer_id: userRec.id, date: u.date, half: 'FIRST_HALF', applied_by: 'ADMIN' },
                { photographer_id: userRec.id, date: u.date, half: 'SECOND_HALF', applied_by: 'ADMIN' }
            ]);
        }
    }
    console.log('Restore complete.');
}
restoreLeaves();

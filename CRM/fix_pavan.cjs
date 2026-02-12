
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function recreatePavan() {
    const email = 'pavanmanne735@gmail.com';
    const password = 'Pavan@123';
    const name = 'Mallikarjun';

    console.log(`Recreating Pavan (Mallikarjun) from scratch...`);

    // 1. Create Auth Account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { name: name, role: 'PHOTOGRAPHER' }
    });

    if (authError) {
        console.error('Auth creation failed:', authError);
        return;
    }

    const userId = authData.user.id;
    console.log(`Auth account created with fresh ID: ${userId}`);

    // 2. Create DB Record
    const { data: dbData, error: dbError } = await supabase
        .from('users')
        .insert({
            id: userId,
            email: email,
            name: name,
            role: 'PHOTOGRAPHER',
            active: true
        })
        .select()
        .single();

    if (dbError) {
        console.error('DB insertion failed:', dbError);
        // Cleanup auth if DB fails
        await supabase.auth.admin.deleteUser(userId);
    } else {
        console.log('DB record created successfully. Account is ready for login.');
    }
}

recreatePavan();

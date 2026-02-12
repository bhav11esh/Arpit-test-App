
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUser() {
    const oldEmail = 'akhilmcmahan02@gmail.com';
    const newEmail = 'aka246966@gmail.com';
    const newPassword = 'Akhil@123';
    const userId = '6c1d0f86-9cf4-4028-9e96-2919800f5190';

    console.log(`Fixing photographer Akhil...`);

    // 1. Update public.users table
    console.log(`Updating public.users table...`);
    const { error: dbError } = await supabase
        .from('users')
        .update({ email: newEmail })
        .eq('id', userId);

    if (dbError) {
        console.error('Error updating public.users:', dbError);
        return;
    }
    console.log('Public.users table updated successfully');

    // 2. Update Auth user
    console.log(`Updating Supabase Auth account...`);
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        email: newEmail,
        password: newPassword,
        email_confirm: true
    });

    if (authError) {
        console.error('Error updating Auth user:', authError);
        // If not found, try creating
        if (authError.status === 404 || authError.message.includes('not found')) {
            console.log('Auth user not found by ID, trying to create...');
            const { error: createError } = await supabase.auth.admin.createUser({
                id: userId,
                email: newEmail,
                password: newPassword,
                email_confirm: true,
                user_metadata: { name: 'Akhil', role: 'PHOTOGRAPHER' }
            });
            if (createError) {
                console.error('Error creating Auth user:', createError);
            } else {
                console.log('Auth user created successfully');
            }
        }
        return;
    }
    console.log('Auth user updated successfully');
}

fixUser();

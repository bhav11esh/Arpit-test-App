const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars manually since we are in node
// Simple parsing of .env
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', supabaseUrl);
console.log('Service Key (first 10 chars):', supabaseServiceKey ? supabaseServiceKey.substring(0, 10) + '...' : 'MISSING');

if (!supabaseServiceKey) {
    console.error('Missing Service Key!');
    process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function testUpload() {
    console.log('Testing upload with admin client...');

    const fileName = `test_upload_${Date.now()}.txt`;
    const fileContent = 'This is a test file to verify admin upload permissions.';

    // Upload
    const { data, error } = await adminSupabase.storage
        .from('screenshots')
        .upload(fileName, Buffer.from(fileContent), {
            contentType: 'text/plain',
            upsert: true
        });

    if (error) {
        console.error('❌ Upload Failed:', error);
    } else {
        console.log('✅ Upload Success:', data);

        // Cleanup - delete the file
        const { error: deleteError } = await adminSupabase.storage
            .from('screenshots')
            .remove([fileName]);

        if (deleteError) {
            console.error('Warning: Failed to cleanup test file:', deleteError);
        } else {
            console.log('✅ Cleanup Success');
        }
    }
}

testUpload();

# Supabase Setup Guide

This guide will help you set up Supabase for the Delivery Operations application.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Node.js and npm installed
- Basic knowledge of SQL

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in your project details:
   - Name: Delivery Operations (or your preferred name)
   - Database Password: Choose a strong password (save this!)
   - Region: Choose the closest region to your users
4. Click "Create new project" and wait for it to be ready (2-3 minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase project dashboard, go to Settings → API
2. Copy the following:
   - Project URL (under "Project URL")
   - Anon/Public Key (under "Project API keys" → "anon public")

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env` in the project root:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 4: Run Database Migrations

1. In your Supabase project, go to SQL Editor
2. Open the file `supabase/migrations/001_initial_schema.sql`
3. Copy the entire SQL content
4. Paste it into the SQL Editor in Supabase
5. Click "Run" to execute the migration

This will create:
- All necessary tables (users, clusters, dealerships, mappings, deliveries, screenshots, reel_tasks, leaves, log_events, geofence_breaches)
- Row Level Security (RLS) policies
- Indexes for performance
- Triggers for updated_at timestamps
- Real-time subscriptions

## Step 5: Set Up Storage Bucket

1. In Supabase, go to Storage
2. Click "Create bucket"
3. Name: `screenshots`
4. Make it **Public** (for reading screenshots)
5. Click "Create bucket"

## Step 6: Create Initial Admin User

You need to create an admin user in the database. You can do this in two ways:

### Option A: Using Supabase Dashboard

1. Go to Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter email and password
4. Note the User ID (UUID)

5. Go to SQL Editor and run:
   ```sql
   INSERT INTO public.users (id, email, name, role, active)
   VALUES ('<user-id-from-auth>', 'admin@example.com', 'Admin User', 'ADMIN', true);
   ```

### Option B: Using SQL (if you have email confirmation disabled)

1. Go to SQL Editor
2. Run:
   ```sql
   -- First create auth user (you'll need to use Supabase Auth API or dashboard for this)
   -- Then insert into users table:
   INSERT INTO public.users (id, email, name, role, active)
   VALUES (
     '<auth-user-id>',
     'admin@example.com',
     'Admin User',
     'ADMIN',
     true
   );
   ```

## Step 7: Enable Real-time

Real-time is already enabled in the migration script, but verify:

1. Go to Database → Replication
2. Ensure these tables have replication enabled:
   - deliveries
   - screenshots
   - reel_tasks
   - log_events

## Step 8: Test the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open the app in your browser
4. Try logging in with your admin credentials

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env` file exists and has correct values
- Restart your dev server after changing `.env`

### "User not found in database"
- Make sure you've created a user record in the `users` table
- The user ID in `users` table should match the auth user ID

### "Permission denied" errors
- Check that RLS policies are correctly set up
- Verify your user has the correct role (ADMIN or PHOTOGRAPHER)

### Real-time not working
- Check that real-time is enabled for the tables
- Verify your Supabase project has real-time enabled (free tier has limits)

### Storage upload fails
- Ensure the `screenshots` bucket exists and is public
- Check bucket policies allow authenticated uploads

## Next Steps

- Seed initial data (clusters, dealerships, etc.) through the admin interface
- Set up email templates for password reset (in Supabase Auth settings)
- Configure backup schedules (in Supabase project settings)
- Set up monitoring and alerts

## Security Notes

- Never commit `.env` file to version control
- The anon key is safe to use in client-side code (RLS protects your data)
- Use service role key only in secure server-side code (never in client)
- Regularly review and update RLS policies
- Enable MFA for your Supabase account

## Support

For issues with:
- **Supabase**: Check https://supabase.com/docs
- **This Application**: Check the main README.md

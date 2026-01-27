# Fix for Infinite Recursion in RLS Policies

## Problem

You're encountering an error: **"infinite recursion detected in policy for relation 'users'"**

This happens because the RLS policies on the `users` table are trying to check if a user is an admin by querying the `users` table itself, creating a circular dependency.

## Solution

I've created a fix migration that:
1. Creates security definer functions that bypass RLS to check admin status
2. Updates all policies to use these functions instead of direct queries
3. Prevents infinite recursion across all tables

## How to Apply the Fix

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/migrations/002_fix_users_rls_recursion.sql`
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click **Run** to execute

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

## Verification

After running the migration, test the fix:

1. Try querying users again:
   ```sql
   SELECT * FROM users WHERE email = 'your-email@example.com';
   ```

2. The query should work without recursion errors

3. Test admin access:
   - Log in as admin
   - Try accessing admin features
   - Should work without permission errors

## What Changed

### Before (Causing Recursion):
```sql
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users  -- ❌ This causes recursion!
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );
```

### After (Fixed):
```sql
-- Security definer function (bypasses RLS)
CREATE FUNCTION public.is_admin()
RETURNS boolean
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text AND role = 'ADMIN'
  );
$$;

-- Policy using the function (no recursion)
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (public.is_admin());  -- ✅ Uses function, no recursion
```

## Important Notes

- The `SECURITY DEFINER` function runs with the privileges of the function creator (bypasses RLS)
- This is safe because the function only checks the current authenticated user
- All policies now use these helper functions to prevent recursion
- The fix applies to all tables, not just users

## If Issues Persist

1. **Clear browser cache** and try again
2. **Check Supabase logs** for any other errors
3. **Verify the migration ran successfully** in Supabase dashboard
4. **Ensure your user has ADMIN role** in the database

## Testing After Fix

1. ✅ Query users table without errors
2. ✅ Admin can view all users
3. ✅ Admin can manage configuration
4. ✅ Photographers can only see their own data
5. ✅ No recursion errors in logs

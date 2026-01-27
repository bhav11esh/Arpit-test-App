# Application Testing Checklist

Use this checklist to verify your Supabase integration is working correctly.

## Pre-Testing Verification

- [x] Supabase project created
- [x] Database migration executed
- [x] Storage bucket created (`screenshots`)
- [x] Environment variables configured
- [x] Admin user created in database

## Testing Steps

### 1. Start the Application

```bash
npm run dev
```

The app should start without errors. Look for:
- ✓ No "Missing Supabase environment variables" error
- ✓ Development server starts successfully
- ✓ Local URL displayed (usually http://localhost:5173)

### 2. Test Authentication

1. **Open the login page**
   - Should see email/password login form
   - Should NOT see mock user selection buttons

2. **Test login with admin credentials**
   - Enter your admin email and password
   - Should successfully log in
   - Should redirect to `/view` (admin dashboard)

3. **Test invalid credentials**
   - Enter wrong password
   - Should show error message
   - Should NOT log in

4. **Test password reset**
   - Click "Forgot password?"
   - Enter email
   - Should show success message
   - Check email for reset link (if email configured)

### 3. Test Admin Features

1. **Access Admin Config**
   - Navigate to `/admin/config`
   - Should see configuration options:
     - Clusters
     - Dealerships
     - Photographers
     - Mappings
     - User Management (NEW)
     - Analytics Dashboard (NEW)

2. **Test User Management**
   - Click "User Management"
   - Should see list of users (at least your admin user)
   - Click "Add User"
   - Create a test photographer user
   - Verify user appears in list
   - Test editing user
   - Test deactivating/activating user

3. **Test Analytics Dashboard**
   - Click "Analytics Dashboard"
   - Should see:
     - Stats cards (Total Deliveries, Completed, Pending, Active Photographers)
     - Daily delivery trends chart
     - Top photographers chart
   - Charts may be empty if no data exists yet

4. **Test Configuration Management**
   - Go to `/admin/config/clusters`
   - Try creating a new cluster
   - Verify it saves to database
   - Try editing and deleting
   - Repeat for Dealerships, Photographers, and Mappings

### 4. Test Real-Time Sync

1. **Open app in two browser tabs/windows**
2. **In one tab:**
   - Create a new delivery or update existing data
3. **In the other tab:**
   - Should see the change appear automatically (real-time sync)

### 5. Test File Upload (Screenshots)

1. **Create a delivery** (if you have deliveries)
2. **Try uploading a screenshot**
   - Should validate file type and size
   - Should show upload progress
   - Should generate thumbnail
   - Should save to Supabase Storage

### 6. Test Data Persistence

1. **Create some test data:**
   - Add a cluster
   - Add a dealership
   - Add a photographer
   - Create a mapping

2. **Refresh the page**
   - All data should persist
   - Should NOT revert to mock data

3. **Log out and log back in**
   - Data should still be there

### 7. Test Error Handling

1. **Disconnect internet**
   - Try performing an action
   - Should show appropriate error message
   - Operations should queue for when connection restored

2. **Reconnect internet**
   - Queued operations should process

## Common Issues & Solutions

### Issue: "Missing Supabase environment variables"
**Solution:** 
- Check `.env` file exists
- Verify variables are set correctly
- Restart dev server after changing `.env`

### Issue: "User not found in database"
**Solution:**
- Verify user exists in `users` table
- Check user ID matches auth user ID
- Ensure user has correct role (ADMIN or PHOTOGRAPHER)

### Issue: "Permission denied" errors
**Solution:**
- Check RLS policies are set up correctly
- Verify user role in database
- Ensure user is active

### Issue: Real-time not working
**Solution:**
- Check real-time is enabled in Supabase
- Verify tables have replication enabled
- Check browser console for WebSocket errors

### Issue: File upload fails
**Solution:**
- Verify `screenshots` bucket exists
- Check bucket is public
- Verify bucket policies allow uploads

## Success Criteria

✅ All authentication flows work
✅ Admin can manage users
✅ Admin can view analytics
✅ Configuration changes persist
✅ Real-time sync works across tabs
✅ File uploads work
✅ Data persists after refresh
✅ Error handling works correctly

## Next Steps After Testing

Once everything works:
1. Seed initial data (clusters, dealerships, etc.)
2. Create additional user accounts
3. Configure email templates in Supabase
4. Set up monitoring and alerts
5. Plan for production deployment

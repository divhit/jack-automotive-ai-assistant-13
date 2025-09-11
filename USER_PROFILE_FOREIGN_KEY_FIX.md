# User Profile Foreign Key Constraint Fix

## Problem
The organization signup process was failing with a foreign key constraint error:

```
Error creating/updating profile: {
  code: '23503',
  details: 'Key (id)=(e2d3f93c-a16f-465a-9e2e-1c99c1836cb4) is not present in table "users".',
  hint: null,
  message: 'insert or update on table "user_profiles" violates foreign key constraint "user_profiles_id_fkey"'
}
```

## Root Cause
The `user_profiles` table has a foreign key constraint:
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  -- ... other columns
);
```

The server was trying to create a user profile before verifying that the user exists in the `auth.users` table. This could happen due to:
1. Timing issues between user signup and organization creation
2. Failed user signup that wasn't properly handled
3. Mismatch in user IDs between frontend and backend

## Solution
Added a verification step in the organization creation endpoint (`/api/auth/organizations`) to check if the user exists in `auth.users` before creating the profile:

```javascript
// STEP 2: Verify user exists in auth.users before creating profile
const authUserResult = await client.auth.admin.getUserById(user_id);

if (authUserResult.error || !authUserResult.data.user) {
  console.error('❌ User not found in auth.users:', authUserResult.error);
  return res.status(400).json({ 
    error: 'User not found in authentication system. Please complete signup first.',
    details: authUserResult.error?.message
  });
}

console.log('✅ User verified in auth.users:', authUserResult.data.user.email);
```

## Technical Details
- Uses Supabase Admin API to verify user existence
- Requires `SUPABASE_SERVICE_ROLE_KEY` environment variable to be set
- Provides clear error message if user doesn't exist
- Prevents the foreign key constraint violation

## Expected Behavior
- If user exists in `auth.users`: Organization creation proceeds normally
- If user doesn't exist: Returns clear error message asking user to complete signup first
- No more foreign key constraint violations

## Files Modified
- `server.js`: Added user verification step in organization creation endpoint

## Environment Requirements
Ensure these environment variables are set:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key with admin permissions (not anon key)

## Testing
After this fix, the organization signup should either:
1. Succeed normally if user exists in auth.users
2. Return a clear error message if user doesn't exist, preventing the foreign key error

## Security Notes
- Uses service role key only for admin verification
- Maintains proper organization isolation
- No cross-organization data leakage 
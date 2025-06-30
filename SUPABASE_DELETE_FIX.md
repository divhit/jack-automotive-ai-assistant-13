# 🔧 Supabase Delete Functionality Fix

## 🚨 **Root Cause Identified**
Your delete functionality isn't working because the Supabase API key is **invalid** for your project `dgzadilmtuqvimolzxms`.

**Error**: `401 Invalid API key` - The hardcoded API keys don't match your actual Supabase project.

## 🛠️ **Complete Fix Instructions**

### Step 1: Get Correct API Keys from Supabase Dashboard

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/dgzadilmtuqvimolzxms
2. **Navigate to Settings**: Click "Settings" in the left sidebar
3. **Go to API**: Click "API" tab
4. **Copy the following keys**:

```bash
# Project URL (already correct)
SUPABASE_URL=https://dgzadilmtuqvimolzxms.supabase.co

# Anon Key (get from dashboard)
SUPABASE_ANON_KEY=eyJ... (your real anon key)

# Service Role Key (get from dashboard - needed for deletions)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (your real service role key)
```

### Step 2: Create .env File

Create a `.env` file in your project root:

```bash
# Supabase Configuration
SUPABASE_URL=https://dgzadilmtuqvimolzxms.supabase.co
SUPABASE_ANON_KEY=your_real_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_real_service_role_key_here
ENABLE_SUPABASE_PERSISTENCE=true

# Frontend Environment Variables
REACT_APP_SUPABASE_URL=https://dgzadilmtuqvimolzxms.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_real_anon_key_here
```

### Step 3: Update Your Code (Already Done)

✅ **Fixed**: `src/integrations/supabase/client.ts` - Now uses environment variables
✅ **Fixed**: `services/supabasePersistence.js` - Better error handling and environment variable support

### Step 4: Verify Your Database Schema

Make sure your `leads` table exists in Supabase:

1. **Go to Supabase Dashboard** → **SQL Editor**
2. **Run this query** to check if table exists:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'leads';
```

3. **If table doesn't exist**, run your schema creation SQL:
```sql
-- Your leads table creation SQL from supabase-crm-schema.sql
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  phone_number_normalized TEXT,
  email TEXT,
  -- ... other columns
);
```

### Step 5: Test the Fix

After updating your API keys, run this test:

```bash
# Test Supabase connection
node test-supabase-delete.js
```

Expected output:
```
✅ Connected to Supabase successfully
📊 Found X leads in database
✅ Lead deleted successfully
🎉 Supabase connection and permissions are working correctly!
```

## 🔍 **Why This Happened**

1. **Hardcoded Keys**: The code had placeholder/wrong API keys
2. **Wrong Project**: The keys were for a different Supabase project
3. **No Environment Variables**: Keys weren't being loaded from .env file

## 🚀 **Expected Behavior After Fix**

1. **Individual Delete**: `handleDeleteLead()` will actually delete from Supabase
2. **Delete All**: `handleDeleteAllLeads()` will clear the entire database
3. **Persistent Changes**: Deleted leads won't reappear after page refresh
4. **Proper Error Handling**: Clear error messages if something goes wrong

## 🧪 **Testing Checklist**

After applying the fix:

- [ ] Individual lead delete works
- [ ] Delete all leads works  
- [ ] Deleted leads don't reappear on refresh
- [ ] Error messages are clear and helpful
- [ ] Dashboard shows correct data source (Database vs Memory)

## 📋 **Row Level Security (RLS) Considerations**

If you still get permission errors after fixing API keys:

1. **Check RLS Status**:
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'leads';
```

2. **Temporarily Disable RLS** (for testing):
```sql
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
```

3. **Or Create Permissive Policy**:
```sql
CREATE POLICY "Allow all operations" ON leads
FOR ALL USING (true) WITH CHECK (true);
```

## 🎯 **Next Steps**

1. **Get your real API keys** from the Supabase dashboard
2. **Create .env file** with the correct keys
3. **Restart your development server**
4. **Test the delete functionality**

Once this is fixed, your delete operations will work correctly and persistently remove leads from your Supabase database. 
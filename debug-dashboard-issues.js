// Debug script for Subprime Dashboard issues
// Run this in browser console to debug

console.log('🔧 DEBUGGING SUBPRIME DASHBOARD ISSUES...\n');

// 1. Check permissions in browser console
console.log('1. 🔍 ADD LEAD BUTTON DEBUG:');
console.log('Open browser console and type:');
console.log(`
// Check current auth state
const authContext = window.__AUTH_DEBUG__;
console.log('Auth State:', {
  user: authContext?.user?.email,
  profile: authContext?.profile,
  organization: authContext?.organization,
  hasCreatePermission: authContext?.hasPermission?.('lead:create'),
  hasAdminRole: authContext?.hasRole?.('admin'),
  hasManagerRole: authContext?.hasRole?.('manager')
});
`);

// 2. Fix ElevenLabs Analytics showing global data
console.log('\n2. 🚨 ELEVENLABS ANALYTICS SECURITY FIX:');
console.log('PROBLEM: RealTimeAnalyticsPanel shows global data');
console.log('FILE: src/components/subprime/analytics/RealTimeAnalyticsPanel.tsx');
console.log('CHANGE NEEDED:');
console.log(`
// BEFORE (line ~32):
const response = await fetch('/api/analytics/global');

// AFTER (organization-scoped):
const response = await fetch(\`/api/analytics/global?organization_id=\${organization?.id}\`);

// AND add useAuth:
import { useAuth } from '@/contexts/AuthContext';
const { organization } = useAuth();

// AND add organization check:
if (!organization?.id) {
  console.warn('No organization context for analytics');
  return;
}
`);

// 3. Fix slow login issue
console.log('\n3. ⏰ SLOW LOGIN FIX:');
console.log('PROBLEM: 2-minute loading when signing in to non-admin accounts');
console.log('LIKELY CAUSE: Missing user_profiles records or database timeout');
console.log('SOLUTION: Add SQL to create missing profiles');

console.log(`
-- Check for missing profiles:
SELECT 
  au.id as user_id,
  au.email,
  up.id as profile_id
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- Create missing profile for current user:
INSERT INTO public.user_profiles (
  id, 
  organization_id, 
  email, 
  first_name, 
  last_name, 
  role, 
  is_active,
  timezone,
  preferences
) VALUES (
  '{current_user_id}', 
  '{default_org_id}', 
  '{user_email}', 
  'User', 
  'Name', 
  'agent', 
  true,
  'UTC',
  '{}'
);
`);

console.log('\n4. 📋 IMMEDIATE FIXES NEEDED:');
console.log('✅ Add debug to SubprimeDashboard.tsx to see permission values');
console.log('🚨 Fix RealTimeAnalyticsPanel to use organization_id');  
console.log('⏰ Create missing user_profiles for slow login accounts');

console.log('\n5. 🎯 TEST PLAN:');
console.log('1. Add console.log to SubprimeDashboard permissions');
console.log('2. Check browser console for permission values');
console.log('3. Fix RealTimeAnalyticsPanel organization filtering');
console.log('4. Check Supabase for missing user_profiles');
console.log('5. Test login speed after profile creation');

console.log('\n📧 For email: divhit@gmail.com (fast login)');
console.log('🐌 For other emails: slow login (missing profiles)');

// Quick fix for ElevenLabs Analytics
console.log('\n🔧 QUICK FIX COMMAND:');
console.log('Replace line 32 in RealTimeAnalyticsPanel.tsx:');
console.log('FROM: const response = await fetch(\'/api/analytics/global\');');
console.log('TO:   const response = await fetch(`/api/analytics/global?organization_id=${organization?.id}`);'); 
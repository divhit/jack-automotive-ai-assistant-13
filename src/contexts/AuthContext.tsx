import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Types for our multi-tenant auth system
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  domain?: string;
  settings: Record<string, any>;
  subscription_tier: 'basic' | 'professional' | 'enterprise';
  is_active: boolean;
}

export interface UserProfile {
  id: string;
  organization_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  avatar_url?: string;
  role: 'super_admin' | 'admin' | 'manager' | 'agent' | 'viewer';
  is_active: boolean;
  timezone: string;
  preferences: Record<string, any>;
  last_login_at?: string;
}

export interface AuthContextType {
  // Auth state
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  organization: Organization | null;
  
  // Loading states
  loading: boolean;
  profileLoading: boolean;
  organizationLoading: boolean;
  
  // Auth methods
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signUp: (email: string, password: string, orgData?: OrganizationSignupData) => Promise<{ error?: AuthError }>;
  signOut: () => Promise<{ error?: AuthError }>;
  
  // Organization methods
  createOrganization: (data: OrganizationCreateData) => Promise<{ data?: Organization; error?: Error }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error?: Error }>;
  
  // Permissions
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
  
  // Utility
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
  
  // Computed properties for convenience
  hasOrganization: boolean;
  organizationId: string | undefined;
  organizationName: string | undefined;
  leadId: string | undefined;
}

export interface OrganizationSignupData {
  organizationName: string;
  organizationSlug: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface OrganizationCreateData {
  name: string;
  slug: string;
  domain?: string;
  phone_number?: string;
  email?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Core auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [organizationLoading, setOrganizationLoading] = useState(false);

  // Initialize auth listener
  useEffect(() => {
    let mounted = true;

    // Failsafe: Force loading to false after 15 seconds to prevent infinite loading
    const failsafeTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth loading timeout - forcing loading to false');
        setLoading(false);
      }
    }, 15000);

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
          return;
        }

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          
          if (initialSession?.user) {
            await loadUserData(initialSession.user.id);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
          clearTimeout(failsafeTimeout); // Clear the failsafe since we completed normally
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event);
        
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          if (event === 'SIGNED_IN' && currentSession?.user) {
            try {
              // Add timeout to prevent hanging
              await Promise.race([
                loadUserData(currentSession.user.id),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('loadUserData timeout')), 10000)
                )
              ]);
              await updateLastLogin(currentSession.user.id);
            } catch (error) {
              console.error('Error in auth state change handler:', error);
              // Continue without profile - don't block the app
            }
          } else if (event === 'SIGNED_OUT') {
            setProfile(null);
            setOrganization(null);
          }
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(failsafeTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Load user profile and organization data
  const loadUserData = async (userId: string) => {
    setProfileLoading(true);
    setOrganizationLoading(true);

    try {
      // Load user profile - using type assertion for tables not in generated types
      const { data: profileData, error: profileError } = await (supabase as any)
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        // Handle different error types gracefully
        if (profileError.code === 'PGRST116') {
          // Profile doesn't exist - this might be a race condition with the trigger
          console.log('No profile found for user - waiting for auto-creation...');
          
          // Wait a moment and try again (trigger might still be running)
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: retryData, error: retryError } = await (supabase as any)
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
          if (!retryError && retryData) {
            setProfile(retryData as UserProfile);
            
            // Load organization data if user has an organization
            if (retryData.organization_id) {
              const { data: orgData, error: orgError } = await (supabase as any)
                .from('organizations')
                .select('*')
                .eq('id', retryData.organization_id)
                .single();

              if (!orgError && orgData) {
                setOrganization(orgData as Organization);
              }
            }
          } else {
            console.warn('Profile still not found after retry - user can continue without profile');
          }
        } else if (profileError.message?.includes('406') || (profileError as any).status === 406) {
          // Table doesn't exist or permission issue - warn but don't break
          console.warn('User profiles table may not exist yet. Please run the database schema.');
          console.warn('Error details:', profileError);
        } else {
          console.error('Error loading user profile:', profileError);
        }
      } else {
        setProfile(profileData as UserProfile);

        // Load organization data if user has an organization
        if (profileData.organization_id) {
          const { data: orgData, error: orgError } = await (supabase as any)
            .from('organizations')
            .select('*')
            .eq('id', profileData.organization_id)
            .single();

          if (orgError) {
            console.error('Error loading organization:', orgError);
          } else {
            setOrganization(orgData as Organization);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Don't throw - allow the app to continue working without profile
    } finally {
      setProfileLoading(false);
      setOrganizationLoading(false);
    }
  };

  // Update last login timestamp
  const updateLastLogin = async (userId: string) => {
    try {
      await (supabase as any)
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  };

  // Sign in
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error('Sign in failed: ' + error.message);
        return { error };
      }

      toast.success('Welcome back!');
      return {};
    } catch (error) {
      const authError = error as AuthError;
      toast.error('Unexpected error during sign in');
      return { error: authError };
    }
  };

  // Sign up with organization creation
  const signUp = async (
    email: string, 
    password: string, 
    orgData?: OrganizationSignupData
  ) => {
    try {
      // Get the site URL - use production URL in production, localhost in dev
      const siteUrl = import.meta.env.VITE_SITE_URL || 
                     import.meta.env.REACT_APP_SITE_URL || 
                     (import.meta.env.PROD ? 'https://jack-automotive-ai-assistant-13.onrender.com' : 'http://localhost:8080');

      // Step 1: Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: siteUrl,
          data: {
            first_name: orgData?.firstName,
            last_name: orgData?.lastName,
            phone_number: orgData?.phoneNumber,
            organization_name: orgData?.organizationName,
            organization_slug: orgData?.organizationSlug,
          }
        }
      });

      if (authError) {
        toast.error('Sign up failed: ' + authError.message);
        return { error: authError };
      }

      // Step 2: If user was created successfully AND we have organization data, create the organization
      if (authData.user && orgData) {
        try {
          console.log('🏢 Creating organization for new user:', {
            user_id: authData.user.id,
            org_name: orgData.organizationName,
            org_slug: orgData.organizationSlug
          });

          // Create organization using server endpoint
          const orgResponse = await fetch('/api/auth/organizations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authData.session?.access_token}`
            },
            body: JSON.stringify({
              name: orgData.organizationName,
              slug: orgData.organizationSlug,
              email: email,
              phone_number: orgData.phoneNumber,
              user_id: authData.user.id,
              first_name: orgData.firstName,
              last_name: orgData.lastName
            })
          });

          if (!orgResponse.ok) {
            const errorData = await orgResponse.json();
            console.error('Failed to setup organization:', errorData);
            // Don't fail the signup if organization setup fails
            toast.warning('Account created but organization setup needs completion. Please contact support.');
          } else {
            const orgData = await orgResponse.json();
            console.log('✅ Organization setup successful:', orgData);
            
            // CRITICAL FIX: Refresh user profile to get the new organization context
            console.log('🔄 Refreshing user profile to load new organization context...');
            try {
              await loadUserData(authData.user.id);
              console.log('✅ User profile refreshed with new organization context');
            } catch (refreshError) {
              console.error('❌ Failed to refresh user profile:', refreshError);
            }
            
            // Provide appropriate feedback based on whether it's a new org or joining existing
            if (orgData.isNewOrganization) {
              toast.success(`Organization "${orgData.organization.name}" created successfully! You are the admin. Please check your email to verify your account.`);
            } else {
              toast.success(`Successfully joined "${orgData.organization.name}" as ${orgData.userRole}. Please check your email to verify your account.`);
            }
          }
        } catch (orgError) {
          console.error('Error creating organization:', orgError);
          toast.warning('Account created but organization setup needs completion. Please contact support.');
        }
      } else {
      toast.success('Account created! Please check your email to verify your account.');
      }

      return {};
    } catch (error) {
      const authError = error as AuthError;
      toast.error('Unexpected error during sign up');
      return { error: authError };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error('Error signing out: ' + error.message);
        return { error };
      }

      toast.success('Signed out successfully');
      return {};
    } catch (error) {
      const authError = error as AuthError;
      toast.error('Unexpected error during sign out');
      return { error: authError };
    }
  };

  // Create organization (for admin users)
  const createOrganization = async (data: OrganizationCreateData) => {
    try {
      const { data: orgData, error } = await (supabase as any)
        .from('organizations')
        .insert([{
          name: data.name,
          slug: data.slug,
          domain: data.domain,
          phone_number: data.phone_number,
          email: data.email,
        }])
        .select()
        .single();

      if (error) {
        return { error: new Error(error.message) };
      }

      toast.success('Organization created successfully');
      return { data: orgData as Organization };
    } catch (error) {
      return { error: error as Error };
    }
  };



  // Update user profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: new Error('No authenticated user') };
    }

    try {
      const { error } = await (supabase as any)
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        return { error: new Error(error.message) };
      }

      // Update local state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Profile updated successfully');
      return {};
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Check if user has specific permission
  const hasPermission = (permission: string): boolean => {
    if (!profile) return false;
    
    // Super admin has all permissions
    if (profile.role === 'super_admin') return true;
    
    // Add your permission logic here based on role and custom permissions
    const rolePermissions: Record<string, string[]> = {
      admin: ['read', 'write', 'delete', 'manage_users', 'manage_settings', 'lead:create', 'lead:update', 'lead:delete'],
      manager: ['read', 'write', 'manage_leads', 'lead:create', 'lead:update', 'lead:delete'],
      agent: ['read', 'write', 'lead:create', 'lead:update'],
      viewer: ['read'],
    };

    return rolePermissions[profile.role]?.includes(permission) || false;
  };

  // Check if user has specific role(s)
  const hasRole = (role: string | string[]): boolean => {
    if (!profile) return false;
    
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(profile.role);
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (user) {
      await loadUserData(user.id);
    }
  };

  const value: AuthContextType = {
    // Auth state
    user,
    session,
    profile,
    organization,
    
    // Loading states
    loading,
    profileLoading,
    organizationLoading,
    
    // Auth methods
    signIn,
    signUp,
    signOut,
    
    // Organization methods
    createOrganization,
    updateProfile,
    
    // Permissions
    hasPermission,
    hasRole,
    
    // Utility
    isAuthenticated: !!user,
    refreshProfile,
    
    // Computed properties for convenience
    hasOrganization: !!organization,
    organizationId: organization?.id || profile?.organization_id,
    organizationName: organization?.name,
    leadId: undefined, // This could be set based on current context
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 
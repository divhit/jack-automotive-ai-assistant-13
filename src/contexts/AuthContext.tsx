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
            await loadUserData(currentSession.user.id);
            await updateLastLogin(currentSession.user.id);
          } else if (event === 'SIGNED_OUT') {
            setProfile(null);
            setOrganization(null);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load user profile and organization data
  const loadUserData = async (userId: string) => {
    setProfileLoading(true);
    setOrganizationLoading(true);

    try {
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        // If profile doesn't exist, this might be a new user - that's ok
        if (profileError.code !== 'PGRST116') {
          console.error('Error loading user profile:', profileError);
        }
      } else {
        setProfile(profileData);

        // Load organization data if user has an organization
        if (profileData.organization_id) {
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profileData.organization_id)
            .single();

          if (orgError) {
            console.error('Error loading organization:', orgError);
          } else {
            setOrganization(orgData);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setProfileLoading(false);
      setOrganizationLoading(false);
    }
  };

  // Update last login timestamp
  const updateLastLogin = async (userId: string) => {
    try {
      await supabase
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

  // Sign up with optional organization creation
  const signUp = async (
    email: string, 
    password: string, 
    orgData?: OrganizationSignupData
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: orgData?.firstName,
            last_name: orgData?.lastName,
            phone_number: orgData?.phoneNumber,
            organization_name: orgData?.organizationName,
            organization_slug: orgData?.organizationSlug,
          }
        }
      });

      if (error) {
        toast.error('Sign up failed: ' + error.message);
        return { error };
      }

      // Note: Profile and organization creation is handled by Supabase triggers/functions
      // or can be handled in the auth state change listener

      toast.success('Account created! Please check your email to verify your account.');
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
      const { data: orgData, error } = await supabase
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
      return { data: orgData };
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
      const { error } = await supabase
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
      admin: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
      manager: ['read', 'write', 'manage_leads'],
      agent: ['read', 'write'],
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 
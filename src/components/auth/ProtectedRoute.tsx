import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Auth from '@/pages/Auth';
import { Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const { isAuthenticated, loading, user, profile, profileLoading, signOut } = useAuth();

  // DEBUG: Log all auth values
  console.log('🔍 ProtectedRoute Debug:', {
    isAuthenticated,
    loading,
    hasUser: !!user,
    hasProfile: !!profile,
    profileLoading,
    userId: user?.id
  });

  // Emergency sign out function - NUCLEAR OPTION
  const emergencySignOut = async () => {
    console.log('🚨 EMERGENCY SIGN OUT - Clearing everything!');
    
    try {
      await signOut();
    } catch (error) {
      console.error('Normal sign out failed:', error);
    }
    
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.error('Global sign out failed:', error);
    }
    
    // NUCLEAR: Clear everything
    localStorage.clear();
    sessionStorage.clear();
    
    // Force redirect to auth page
    window.location.href = '/auth';
  };

  // Show loading spinner while auth state is being determined
  if (loading) {
    console.log('🔄 ProtectedRoute: Showing main loading (loading=true)');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">Loading...</p>
            <p className="text-sm text-gray-500">Checking authentication status</p>
          </div>
          
          {/* Emergency Sign Out Button */}
          <div className="mt-6">
            <Button 
              onClick={emergencySignOut}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Force Sign Out
            </Button>
            <p className="text-xs text-gray-400 mt-2">Stuck? Click to reset</p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, show Auth page or custom fallback
  if (!isAuthenticated) {
    console.log('🚫 ProtectedRoute: Not authenticated - showing auth page');
    return fallback || <Auth />;
  }

  // If authenticated but profile is still loading, show brief loading
  if (user && !profile && profileLoading) {
    console.log('👤 ProtectedRoute: Profile loading - showing profile loading');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">Setting up your account...</p>
            <p className="text-sm text-gray-500">This will just take a moment</p>
          </div>
          
          {/* Emergency Sign Out Button */}
          <div className="mt-6">
            <Button 
              onClick={emergencySignOut}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated and ready - render protected content
  console.log('✅ ProtectedRoute: Rendering protected content');
  return <>{children}</>;
}; 
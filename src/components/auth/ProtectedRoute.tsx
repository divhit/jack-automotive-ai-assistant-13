import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Auth from '@/pages/Auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const { isAuthenticated, loading, user, profile, organization } = useAuth();

  // Show loading spinner while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">Loading...</p>
            <p className="text-sm text-gray-500">Checking authentication status</p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, show Auth page or custom fallback
  if (!isAuthenticated) {
    return fallback || <Auth />;
  }

  // If authenticated but no profile/organization (edge case), show loading
  if (user && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">Setting up your account...</p>
            <p className="text-sm text-gray-500">This will just take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated and ready - render protected content
  return <>{children}</>;
}; 
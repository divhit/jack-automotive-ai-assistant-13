import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Card components removed — auth layout handled by Auth.tsx
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface LoginFormProps {
  onSwitchToSignup?: () => void;
  className?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup, className }) => {
  const { signIn, resetPassword } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(formData.email, formData.password);

      if (error) {
        // Handle specific error cases
        if (error.message?.includes('Invalid login credentials')) {
          setErrors({
            password: 'Invalid email or password. Please check your credentials and try again.'
          });
        } else if (error.message?.includes('Email not confirmed')) {
          setErrors({
            email: 'Please check your email and click the confirmation link before signing in.'
          });
        } else {
          setErrors({
            general: error.message || 'An unexpected error occurred. Please try again.'
          });
        }
      }
      // Success handling is done in the AuthContext with toast notification
    } catch (error) {
      console.error('Login error:', error);
      setErrors({
        general: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(resetEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(resetEmail);
      // Reset the form and switch back to login mode
      setIsForgotPassword(false);
      setResetEmail('');
    } catch (error) {
      console.error('Password reset error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">
          {isForgotPassword ? 'Reset Password' : 'Welcome back'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          {isForgotPassword
            ? 'Enter your email to receive a password reset link'
            : 'Sign in to your dealership dashboard'}
        </p>
      </div>

      <div>
        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            {/* Email Field for Password Reset */}
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  disabled={isLoading}
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Reset Link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>

            {/* Back to Login */}
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setIsForgotPassword(false);
                  setResetEmail('');
                }}
                disabled={isLoading}
                className="text-sm"
              >
                Back to Login
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* General Error Alert */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange('email')}
                disabled={isLoading}
                className={`pl-10 ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange('password')}
                disabled={isLoading}
                className={`pl-10 ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                autoComplete="current-password"
              />
            </div>
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </Button>

          {/* Switch to Signup */}
          {onSwitchToSignup && (
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Button
                type="button"
                variant="link"
                onClick={onSwitchToSignup}
                disabled={isLoading}
                className="p-0 h-auto font-medium"
              >
                Create one here
              </Button>
            </div>
          )}

          {/* Forgot Password Link */}
          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => setIsForgotPassword(true)}
              disabled={isLoading}
              className="text-sm text-muted-foreground"
            >
              Forgot your password?
            </Button>
          </div>
        </form>
      )}
      </div>
    </div>
  );
}; 
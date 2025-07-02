import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, User, Mail, Lock, Building, Phone, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth, OrganizationSignupData } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SignupFormProps {
  onSwitchToLogin?: () => void;
  className?: string;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin, className }) => {
  const { signUp } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    organizationName: '',
    organizationSlug: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const generateSlug = (orgName: string) => {
    return orgName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.organizationName) {
      newErrors.organizationName = 'Dealership name is required';
    }

    if (!formData.organizationSlug) {
      newErrors.organizationSlug = 'URL identifier is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'organizationName') {
      const slug = generateSlug(value);
      setFormData(prev => ({ ...prev, organizationSlug: slug }));
    }
    
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
      const orgData: OrganizationSignupData = {
        organizationName: formData.organizationName,
        organizationSlug: formData.organizationSlug,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        phoneNumber: formData.phoneNumber || undefined,
      };

      const { error } = await signUp(formData.email, formData.password, orgData);
      
      if (error) {
        if (error.message?.includes('User already registered')) {
          setErrors({ 
            email: 'An account with this email already exists. Please sign in instead.' 
          });
        } else {
          setErrors({ 
            general: error.message || 'An unexpected error occurred. Please try again.' 
          });
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({ 
        general: 'An unexpected error occurred. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={`w-full max-w-lg mx-auto ${className}`}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Create Your Account</CardTitle>
        <CardDescription className="text-center">
          Set up your automotive dealership with AI-powered lead management
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                value={formData.firstName}
                onChange={handleInputChange('firstName')}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleInputChange('lastName')}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange('email')}
                disabled={isLoading}
                className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="organizationName">Dealership Name *</Label>
            <div className="relative">
              <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="organizationName"
                type="text"
                placeholder="Premium Auto Sales"
                value={formData.organizationName}
                onChange={handleInputChange('organizationName')}
                disabled={isLoading}
                className={`pl-10 ${errors.organizationName ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.organizationName && (
              <p className="text-sm text-red-600">{errors.organizationName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="organizationSlug">URL Identifier *</Label>
            <Input
              id="organizationSlug"
              type="text"
              placeholder="premium-auto-sales"
              value={formData.organizationSlug}
              onChange={handleInputChange('organizationSlug')}
              disabled={isLoading}
              className={errors.organizationSlug ? 'border-red-500' : ''}
            />
            {errors.organizationSlug && (
              <p className="text-sm text-red-600">{errors.organizationSlug}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleInputChange('password')}
                disabled={isLoading}
                className={`pl-10 ${errors.password ? 'border-red-500' : ''}`}
                autoComplete="new-password"
              />
            </div>
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                disabled={isLoading}
                className={`pl-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                autoComplete="new-password"
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>

          {onSwitchToLogin && (
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Button
                type="button"
                variant="link"
                onClick={onSwitchToLogin}
                disabled={isLoading}
                className="p-0 h-auto font-medium"
              >
                Sign in here
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}; 
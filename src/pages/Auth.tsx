import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, Shield, BarChart3, MessageSquare } from 'lucide-react';

const Auth: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSwitchToSignup = () => setActiveTab('signup');
  const handleSwitchToLogin = () => setActiveTab('login');

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between bg-sidebar text-sidebar-foreground p-10 relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(hsl(220 72% 56%) 1px, transparent 1px), linear-gradient(90deg, hsl(220 72% 56%) 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-semibold text-sidebar-accent-foreground tracking-tight">AutoAI</span>
          </div>

          <h2 className="text-3xl font-bold text-sidebar-accent-foreground leading-tight mb-4">
            AI-Powered Lead<br />Management
          </h2>
          <p className="text-[15px] text-sidebar-foreground leading-relaxed max-w-sm">
            Manage subprime leads, automate follow-ups, and close deals faster with intelligent voice and SMS agents.
          </p>
        </div>

        <div className="relative z-10 space-y-5">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-sidebar-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-sidebar-accent-foreground mb-0.5">Omnichannel AI</h3>
              <p className="text-[13px] text-sidebar-foreground leading-relaxed">
                Voice calls and SMS powered by ElevenLabs and Twilio with shared context.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-4 h-4 text-sidebar-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-sidebar-accent-foreground mb-0.5">Real-time Analytics</h3>
              <p className="text-[13px] text-sidebar-foreground leading-relaxed">
                Track lead quality, sentiment, and funding readiness with live dashboards.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-sidebar-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-sidebar-accent-foreground mb-0.5">Multi-tenant Security</h3>
              <p className="text-[13px] text-sidebar-foreground leading-relaxed">
                Enterprise-grade data isolation per dealership with row-level security.
              </p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-[12px] text-sidebar-foreground/60 mt-8">
          Powered by ElevenLabs, Twilio & Supabase
        </p>
      </div>

      {/* Right Panel — Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">AutoAI</span>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2 mb-8 h-11">
              <TabsTrigger value="login" className="text-sm font-medium">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-sm font-medium">
                Create Account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm onSwitchToSignup={handleSwitchToSignup} />
            </TabsContent>

            <TabsContent value="signup">
              <SignupForm onSwitchToLogin={handleSwitchToLogin} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;

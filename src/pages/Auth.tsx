import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { Badge } from '@/components/ui/badge';
import { Car, Brain, MessageSquare, BarChart3 } from 'lucide-react';

const Auth: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  const handleSwitchToSignup = () => {
    setActiveTab('signup');
  };

  const handleSwitchToLogin = () => {
    setActiveTab('login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AutoAI Assistant</h1>
                <p className="text-sm text-gray-500">Automotive Lead Management Platform</p>
              </div>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Enterprise Ready
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Features */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Transform Your Dealership with AI
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Connect with customers seamlessly across SMS, voice calls, and chat using advanced AI technology.
                Manage leads, track conversations, and boost sales with real-time analytics.
              </p>
            </div>

            <div className="grid gap-6">
              {/* Feature 1 */}
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Brain className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-Powered Conversations</h3>
                  <p className="text-gray-600">
                    ElevenLabs integration provides natural voice conversations that feel human, 
                    while maintaining context across SMS and voice channels.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Omnichannel Communication</h3>
                  <p className="text-gray-600">
                    Seamlessly switch between SMS and voice calls with Twilio integration. 
                    Never lose conversation context as customers move between channels.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Analytics</h3>
                  <p className="text-gray-600">
                    Track lead quality, conversation sentiment, and buying signals in real-time. 
                    Make data-driven decisions to optimize your sales process.
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">95%</div>
                <div className="text-sm text-gray-600">Response Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">3.2x</div>
                <div className="text-sm text-gray-600">Lead Conversion</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">24/7</div>
                <div className="text-sm text-gray-600">AI Availability</div>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Forms */}
          <div className="lg:pl-8">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="flex-1">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">
                  Create Account
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <LoginForm onSwitchToSignup={handleSwitchToSignup} />
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <SignupForm onSwitchToLogin={handleSwitchToLogin} />
              </TabsContent>
            </Tabs>

            {/* Production Ready */}
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-white">✓</span>
                </div>
                <div>
                  <p className="text-sm text-green-800 font-medium">Production Environment</p>
                  <p className="text-xs text-green-700 mt-1">
                    Secure multi-tenant platform with enterprise-grade data isolation.
                    Each dealership has complete data privacy and security.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="text-sm text-gray-500">
              © 2024 AutoAI Assistant. Powered by ElevenLabs, Twilio & Supabase.
            </div>
            <div className="flex space-x-6 text-sm">
              <button className="text-gray-500 hover:text-gray-700">Privacy Policy</button>
              <button className="text-gray-500 hover:text-gray-700">Terms of Service</button>
              <button className="text-gray-500 hover:text-gray-700">Support</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth; 
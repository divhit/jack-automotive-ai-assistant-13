import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { BarChart3, Target, Brain, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsData {
  conversationQuality: number;
  buyingSignalsCount: number;
  conversionRate: number;
  highValueLeads: number;
  totalConversations: number;
  dataSource: string;
  error?: string;
}

export const RealTimeAnalyticsPanel: React.FC = () => {
  const { organization } = useAuth(); // ADD THIS LINE
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    conversationQuality: 0,
    buyingSignalsCount: 0,
    conversionRate: 0,
    highValueLeads: 0,
    totalConversations: 0,
    dataSource: 'loading'
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAnalytics = async () => {
    if (!organization?.id) {
      console.warn('No organization context for analytics');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/global?organization_id=${organization?.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 RealTimeAnalyticsPanel API response:', data);
        
        if (!data.success) {
          throw new Error(data.error || 'API returned success: false');
        }
        
        setAnalytics({
          conversationQuality: data.data?.conversationQuality || data.conversationQuality || 0,
          buyingSignalsCount: data.data?.buyingSignalsCount || data.buyingSignalsCount || 0,
          conversionRate: data.data?.conversionRate || data.conversionRate || 0,
          highValueLeads: data.data?.highValueLeads || data.highValueLeads || 0,
          totalConversations: data.data?.totalConversations || data.totalConversations || 0,
          dataSource: data.data?.dataSource || data.dataSource || 'unknown'
        });
        setLastUpdated(new Date());
      } else {
        throw new Error('API not available');
      }
    } catch (error) {
      console.error('❌ Analytics API failed:', error);
      setAnalytics({
        conversationQuality: 0,
        buyingSignalsCount: 0,
        conversionRate: 0,
        highValueLeads: 0,
        totalConversations: 0,
        dataSource: 'error',
        error: `API Error: ${error.message}`
      });
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organization?.id) {
    fetchAnalytics();
    }
    // Auto-refresh every 2 minutes
    const interval = setInterval(() => {
      if (organization?.id) {
        fetchAnalytics();
      }
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [organization?.id]);

  // Real-time updates via SSE
  useEffect(() => {
    if (!organization?.id) return;

    let eventSource: EventSource | null = null;
    
    try {
      eventSource = new EventSource(`/api/analytics/stream?organizationId=${organization.id}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'conversation_update') {
            console.log('📡 Received real-time analytics update:', data);
            // Refresh analytics when conversation updates occur
            fetchAnalytics();
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        // Fallback to polling if SSE fails
        setTimeout(() => {
          if (organization?.id) {
            fetchAnalytics();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Failed to establish SSE connection:', error);
    }
    
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [organization?.id]);

  const getStatusColor = () => {
    if (analytics.error) return 'text-red-600';
    if (analytics.dataSource === 'live' || analytics.dataSource === 'supabase') return 'text-green-600';
    if (analytics.dataSource === 'fallback') return 'text-blue-600';
    return 'text-yellow-600';
  };

  const getStatusText = () => {
    if (analytics.error) return 'API Error';
    if (analytics.dataSource === 'live' || analytics.dataSource === 'supabase') return 'Live Data';
    if (analytics.dataSource === 'error') return 'System Error';
    return 'Loading...';
  };

  return (
    <div>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Real-Time Metrics</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalytics}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">Conversation Quality</span>
                </div>
                <div className="text-xl font-bold text-blue-700">
                  {loading ? '...' : `${analytics.conversationQuality}%`}
                </div>
                <div className="text-xs text-blue-600">
                  {analytics.dataSource === 'supabase' ? 'From database conversations' : 'Average across all leads'}
                </div>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm">Buying Signals</span>
                </div>
                <div className="text-xl font-bold text-green-700">
                  {loading ? '...' : analytics.buyingSignalsCount}
                </div>
                <div className="text-xs text-green-600">
                  {analytics.dataSource === 'supabase' ? 'From real conversations' : 'Detected this week'}
                </div>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-sm">Conversion Rate</span>
                </div>
                <div className="text-xl font-bold text-purple-700">
                  {loading ? '...' : `${analytics.conversionRate}%`}
                </div>
                <div className="text-xs text-purple-600">
                  {analytics.dataSource === 'supabase' ? 'Real conversion data' : 'CRM Analytics'}
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium mb-2 text-sm">Recent Insights</h4>
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-yellow-600" />
                    <div className="font-medium text-yellow-800">🎯 High Intent Detected</div>
                  </div>
                  <div className="text-yellow-700">
                    {loading ? 'Loading...' : `${analytics.highValueLeads} leads showing strong buying signals`}
                  </div>
                </div>
                
                <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3 text-blue-600" />
                    <div className="font-medium text-blue-800">📊 System Status</div>
                  </div>
                  <div className="text-blue-700">
                    {analytics.error ? (
                      'Database connection issues - using fallback data'
                    ) : loading ? (
                      'Loading system status...'
                    ) : (
                      `${analytics.totalConversations} conversations being analyzed`
                    )}
                  </div>
                </div>

                {analytics.error && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded">
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                      <div className="font-medium text-red-800">⚠️ Connection Alert</div>
                    </div>
                    <div className="text-red-700">
                      Check server logs for Supabase connection status
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 
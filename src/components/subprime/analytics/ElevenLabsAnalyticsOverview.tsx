import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Target, TrendingUp, Brain, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GlobalAnalytics {
  totalLeads: number;
  avgLeadScore: number;
  totalConversations: number;
  highValueLeads: number;
  conversationQuality: number;
  buyingSignalsCount: number;
  conversionRate: number;
  dataSource: string;
  lastUpdated?: string;
  error?: string;
}

export const ElevenLabsAnalyticsOverview: React.FC = () => {
  const [analytics, setAnalytics] = useState<GlobalAnalytics>({
    totalLeads: 0,
    avgLeadScore: 0,
    totalConversations: 0,
    highValueLeads: 0,
    conversationQuality: 0,
    buyingSignalsCount: 0,
    conversionRate: 0,
    dataSource: 'loading'
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analytics/global');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
        setLastRefresh(new Date());
      } else {
        console.error('Failed to fetch analytics:', response.statusText);
        // Keep existing data on error
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Keep existing data on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getDataSourceColor = (source: string) => {
    switch (source) {
      case 'supabase': return 'bg-green-100 text-green-800 border-green-200';
      case 'default': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'loading': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getDataSourceText = (source: string) => {
    switch (source) {
      case 'supabase': return 'Database + Memory';
      case 'default': return 'Database + Memory';
      case 'loading': return 'Loading...';
      default: return 'Real-time Data';
    }
  };

  return (
    <div className="mt-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-purple-900">ElevenLabs Analytics</h3>
            <div className="flex items-center gap-2">
              <p className="text-sm text-purple-600">AI-powered conversation insights</p>
              <Badge className={getDataSourceColor(analytics.dataSource)}>
                {getDataSourceText(analytics.dataSource)}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">
            Updated: {lastRefresh.toLocaleTimeString()}
          </div>
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
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {loading ? '...' : `${analytics.conversationQuality}%`}
                </div>
                <div className="text-sm text-muted-foreground">Conversation Quality</div>
                <div className="text-xs text-blue-600">
                  {loading ? 'Loading...' : 'Average across all leads'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {loading ? '...' : analytics.buyingSignalsCount}
                </div>
                <div className="text-sm text-muted-foreground">Buying Signals</div>
                <div className="text-xs text-green-600">
                  {loading ? 'Loading...' : 'Detected this week'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {loading ? '...' : `${analytics.conversionRate}%`}
                </div>
                <div className="text-sm text-muted-foreground">Conversion Rate</div>
                <div className="text-xs text-purple-600">
                  {loading ? 'Loading...' : 'With ElevenLabs MCP'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border border-purple-100">
          <div className="flex items-center gap-2 text-sm font-medium text-pink-800 mb-2">
            <CheckCircle2 className="h-4 w-4" />
            High Intent Detected
          </div>
          <div className="text-sm text-pink-700">
            {loading ? 'Loading...' : `${analytics.highValueLeads} leads showing strong buying signals`}
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-purple-100">
          <div className="flex items-center gap-2 text-sm font-medium text-orange-800 mb-2">
            <AlertTriangle className="h-4 w-4" />
            System Status
          </div>
          <div className="text-sm text-orange-700">
            {analytics.error ? (
              `Database connection issues detected`
            ) : loading ? (
              'Loading system status...'
            ) : (
              `${analytics.totalConversations} active conversations tracked`
            )}
          </div>
        </div>
      </div>

      {/* Debug Information */}
      {analytics.dataSource === 'default' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <AlertTriangle className="h-4 w-4" />
            <strong>Note:</strong> Using fallback data due to database connection issues. 
            Check server logs for Supabase connection status.
          </div>
        </div>
      )}
    </div>
  );
}; 
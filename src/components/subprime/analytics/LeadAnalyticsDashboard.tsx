import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Phone, 
  MessageSquare, 
  Clock,
  Database,
  Cpu,
  RefreshCw,
  Target,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

interface LeadAnalytics {
  id: string;
  customer_name: string;
  phone_number: string;
  sentiment: string;
  funding_readiness: string;
  lead_score: number;
  total_conversations: number;
  total_sms_messages: number;
  total_voice_calls: number;
  last_activity: string;
}

interface SystemStatus {
  memory: {
    activeConversations: number;
    conversationContexts: number;
    conversationSummaries: number;
    dynamicLeads: number;
    sseConnections: number;
  };
  persistence: {
    enabled: boolean;
    connected: boolean;
    service: string;
  };
  features: {
    telephony: boolean;
    sms: boolean;
    voice: boolean;
    realTimeUpdates: boolean;
    analytics: boolean;
    crm: boolean;
  };
}

export const LeadAnalyticsDashboard: React.FC = () => {
  const [leadsAnalytics, setLeadsAnalytics] = useState<LeadAnalytics[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'database' | 'memory'>('memory');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchLeadsAnalytics(),
        fetchSystemStatus()
      ]);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
      setLastRefresh(new Date());
    }
  };

  const fetchLeadsAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics/leads?limit=100');
      const data = await response.json();
      
      if (data.success) {
        setLeadsAnalytics(data.leads);
        setDataSource(data.source);
        console.log(`📊 Loaded ${data.leads.length} leads from ${data.source}`);
      }
    } catch (error) {
      console.error('Error fetching leads analytics:', error);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/system/status');
      const data = await response.json();
      
      if (data.success) {
        setSystemStatus(data);
      }
    } catch (error) {
      console.error('Error fetching system status:', error);
    }
  };

  const calculateOverallMetrics = () => {
    if (!leadsAnalytics.length) return {
      totalLeads: 0,
      avgLeadScore: 0,
      totalConversations: 0,
      highValueLeads: 0
    };

    const totalLeads = leadsAnalytics.length;
    const avgLeadScore = leadsAnalytics.reduce((sum, lead) => sum + (lead.lead_score || 0), 0) / totalLeads;
    const totalConversations = leadsAnalytics.reduce((sum, lead) => sum + (lead.total_conversations || 0), 0);
    const highValueLeads = leadsAnalytics.filter(lead => (lead.lead_score || 0) > 70).length;

    return { totalLeads, avgLeadScore, totalConversations, highValueLeads };
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'warm': return 'bg-green-500';
      case 'neutral': return 'bg-blue-500';
      case 'cold': return 'bg-gray-500';
      case 'negative': return 'bg-red-500';
      case 'frustrated': return 'bg-orange-500';
      default: return 'bg-gray-400';
    }
  };

  const getFundingReadinessColor = (readiness: string) => {
    switch (readiness?.toLowerCase()) {
      case 'ready': return 'default';
      case 'partial': return 'secondary';
      case 'not ready': return 'outline';
      default: return 'outline';
    }
  };

  const metrics = calculateOverallMetrics();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CRM Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Lead performance and system insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={systemStatus?.persistence.enabled ? 'default' : 'secondary'}>
            {systemStatus?.persistence.enabled ? (
              <>
                <Database className="h-3 w-3 mr-1" />
                Database + Memory
              </>
            ) : (
              <>
                <Cpu className="h-3 w-3 mr-1" />
                Memory Only
              </>
            )}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchAllData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status */}
      {systemStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium">Active SSE Connections</p>
                <p className="text-2xl font-bold text-green-600">{systemStatus.memory.sseConnections}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Active Conversations</p>
                <p className="text-2xl font-bold text-blue-600">{systemStatus.memory.activeConversations}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Stored Contexts</p>
                <p className="text-2xl font-bold text-purple-600">{systemStatus.memory.conversationContexts}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Persistence</p>
                <p className={`text-2xl font-bold ${systemStatus.persistence.enabled ? 'text-green-600' : 'text-orange-600'}`}>
                  {systemStatus.persistence.enabled ? 'ENABLED' : 'DISABLED'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Total Leads</p>
                <p className="text-2xl font-bold">{metrics.totalLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Avg Lead Score</p>
                <p className="text-2xl font-bold">{metrics.avgLeadScore.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Total Conversations</p>
                <p className="text-2xl font-bold">{metrics.totalConversations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">High Value Leads</p>
                <p className="text-2xl font-bold text-green-600">{metrics.highValueLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Performance Overview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Data source: {dataSource === 'database' ? 'Supabase Database' : 'In-Memory Storage'} • 
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leadsAnalytics.slice(0, 10).map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{lead.customer_name}</h3>
                    <Badge variant={getFundingReadinessColor(lead.funding_readiness)}>
                      {lead.funding_readiness}
                    </Badge>
                    <div className={`w-2 h-2 rounded-full ${getSentimentColor(lead.sentiment)}`} />
                  </div>
                  <p className="text-sm text-muted-foreground">{lead.phone_number}</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm font-medium">Score</p>
                    <div className="flex items-center gap-2">
                      <Progress value={lead.lead_score || 0} className="w-16" />
                      <span className="text-sm font-bold">{Math.round(lead.lead_score || 0)}</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium">Conversations</p>
                    <p className="text-lg font-bold">{lead.total_conversations || 0}</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium">Calls</p>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span className="text-sm">{lead.total_voice_calls || 0}</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium">SMS</p>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span className="text-sm">{lead.total_sms_messages || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {leadsAnalytics.length > 10 && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  Showing 10 of {leadsAnalytics.length} leads
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Source Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {dataSource === 'database' ? (
                <Database className="h-4 w-4 text-green-600" />
              ) : (
                <Cpu className="h-4 w-4 text-blue-600" />
              )}
              <span className="text-sm">
                {dataSource === 'database' 
                  ? 'Data loaded from Supabase database with full CRM features'
                  : 'Data loaded from in-memory storage (limited CRM features)'
                }
              </span>
            </div>
            <Badge variant="outline">
              {systemStatus?.persistence.enabled ? 'Persistence Active' : 'Memory Only'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 
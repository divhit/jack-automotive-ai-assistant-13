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
import { useAuth } from '@/contexts/AuthContext';

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
  const { organization } = useAuth();
  const [leadsAnalytics, setLeadsAnalytics] = useState<LeadAnalytics[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'database' | 'memory'>('memory');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (organization?.id) {
      fetchAllData();
    }
  }, [organization?.id]);

  const fetchAllData = async () => {
    if (!organization?.id) {
      console.warn('No organization context available for analytics');
      return;
    }

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
    if (!organization?.id) return;
    
    try {
      const response = await fetch(`/api/analytics/leads?limit=100&organization_id=${organization.id}`);
      const data = await response.json();
      
      if (data.success) {
        setLeadsAnalytics(data.leads);
        setDataSource(data.source);
        console.log(`📊 Loaded ${data.leads.length} leads from ${data.source} for org: ${organization.name}`);
      }
    } catch (error) {
      console.error('Error fetching leads analytics:', error);
    }
  };

  const fetchSystemStatus = async () => {
    if (!organization?.id) return;
    
    try {
      const response = await fetch(`/api/system/status?organization_id=${organization.id}`);
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
    <div className="space-y-6">
      {/* Removed redundant header - parent component handles this */}

      {/* Condensed System & Lead Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Lead Analytics Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Top Performing Leads</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={dataSource === 'database' ? 'default' : 'secondary'}>
                {dataSource === 'database' ? (
                  <>
                    <Database className="h-3 w-3 mr-1" />
                    Database
                  </>
                ) : (
                  <>
                    <Cpu className="h-3 w-3 mr-1" />
                    Memory
                  </>
                )}
              </Badge>
              <Button variant="outline" size="sm" onClick={fetchAllData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Organization: {organization?.name} • Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leadsAnalytics.slice(0, 5).map((lead) => (
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
            
            {leadsAnalytics.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No leads found for organization: {organization?.name}</p>
                <p className="text-sm mt-2">Check your organization filter and data source</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 
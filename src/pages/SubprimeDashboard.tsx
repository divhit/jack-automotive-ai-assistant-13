import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { subprimeLeads } from "@/data";
import { SubprimeLeadFilters } from "@/components/subprime/SubprimeLeadFilters";
import { SubprimeAnalytics } from "@/components/subprime/SubprimeAnalytics";
import { SubprimeLeadsList } from "@/components/subprime/SubprimeLeadsList";
import { SubprimeAddLeadDialog } from "@/components/subprime/SubprimeAddLeadDialog";
import { LeadAnalyticsDashboard } from "@/components/subprime/analytics/LeadAnalyticsDashboard";
import { RealTimeAnalyticsPanel } from "@/components/subprime/analytics/RealTimeAnalyticsPanel";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { BarChart3, Users, MessageSquare, Clock, Info, UserPlus, Database, RefreshCw, Trash2, Target, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubprimeSettingsDialog } from "@/components/subprime/SubprimeSettingsDialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const SubprimeDashboard = () => {
  const { user, profile, organization, signOut, hasRole, hasPermission } = useAuth();

  const [allLeads, setAllLeads] = useState<SubprimeLead[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tileDialogOpen, setTileDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [addLeadDialogOpen, setAddLeadDialogOpen] = useState(false);
  const [activeTileInfo, setActiveTileInfo] = useState<{title: string; content: React.ReactNode}>({
    title: "",
    content: null
  });
  const [activeMainTab, setActiveMainTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [dataSource, setDataSource] = useState<'database' | 'memory'>('memory');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Filter states
  const [chaseStatusFilter, setChaseStatusFilter] = useState<string>("all");
  const [fundingReadinessFilter, setFundingReadinessFilter] = useState<string>("all");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [scriptProgressFilter, setScriptProgressFilter] = useState<string>("all");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  // Real-time update state
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60000);

  // Metrics
  const metrics = useMemo(() => {
    const totalLeads = allLeads.length;
    const readyForFunding = allLeads.filter(lead => lead.fundingReadiness === 'Ready').length;
    const partialFunding = allLeads.filter(lead => lead.fundingReadiness === 'Partial').length;
    const notReady = allLeads.filter(lead => lead.fundingReadiness === 'Not Ready').length;
    const activeChases = allLeads.filter(lead => lead.chaseStatus === 'Auto Chase Running').length;
    const overdueActions = allLeads.filter(lead => lead.nextAction?.isOverdue).length;

    const inProgress = allLeads.filter(lead => {
      const hasRecentActivity = lead.lastTouchpoint &&
        new Date(lead.lastTouchpoint) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const isActivelyChased = lead.chaseStatus === 'Auto Chase Running';
      const isInQualification = lead.scriptProgress?.currentStep === 'qualification' ||
                               lead.scriptProgress?.currentStep === 'screening';
      return hasRecentActivity || isActivelyChased || isInQualification;
    }).length;

    const calculatePercentage = (value: number, total: number) => {
      return total > 0 ? Math.round((value / total) * 100) : 0;
    };

    return {
      totalLeads,
      readyForFunding,
      partialFunding,
      notReady,
      inProgress,
      activeChases,
      overdueActions,
      percentages: {
        readyForFunding: calculatePercentage(readyForFunding, totalLeads),
        partialFunding: calculatePercentage(partialFunding, totalLeads),
        notReady: calculatePercentage(notReady, totalLeads),
        inProgress: calculatePercentage(inProgress, totalLeads),
        overdueActions: calculatePercentage(overdueActions, totalLeads)
      }
    };
  }, [allLeads]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  // Filtering
  const filteredLeadsCalculation = useMemo(() => {
    let filtered = [...allLeads];

    if (searchTerm !== "") {
      filtered = filtered.filter(lead =>
        lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phoneNumber.includes(searchTerm)
      );
    }
    if (chaseStatusFilter !== "all") {
      filtered = filtered.filter(lead => lead.chaseStatus === chaseStatusFilter);
    }
    if (fundingReadinessFilter !== "all") {
      filtered = filtered.filter(lead => lead.fundingReadiness === fundingReadinessFilter);
    }
    if (sentimentFilter !== "all") {
      filtered = filtered.filter(lead => lead.sentiment === sentimentFilter);
    }
    if (scriptProgressFilter !== "all") {
      filtered = filtered.filter(lead => lead.scriptProgress.currentStep === scriptProgressFilter);
    }
    if (showOverdueOnly) {
      filtered = filtered.filter(lead => lead.nextAction?.isOverdue);
    }

    return filtered;
  }, [allLeads, searchTerm, chaseStatusFilter, fundingReadinessFilter, sentimentFilter, scriptProgressFilter, showOverdueOnly]);

  // Load leads from server
  useEffect(() => {
    if (organization?.id) {
      loadLeadsFromServer();
    }
  }, [organization?.id]);

  // Auto-refresh
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (autoRefreshEnabled && organization?.id) {
      intervalId = setInterval(() => {
        loadLeadsFromServer();
      }, refreshInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefreshEnabled, refreshInterval, organization?.id]);

  // Real-time updates via SSE
  useEffect(() => {
    let eventSource: EventSource | null = null;

    if (organization?.id) {
      eventSource = new EventSource(`/api/analytics/stream?organizationId=${organization.id}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'lead_update') {
            updateLeadInState(data.leadId, data.updates);
          } else if (data.type === 'conversation_update') {
            handleConversationUpdate(data);
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      eventSource.onerror = () => {
        setTimeout(() => {
          if (organization?.id) loadLeadsFromServer();
        }, 5000);
      };
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [organization?.id]);

  const updateLeadInState = useCallback((leadId: string, updates: Partial<SubprimeLead>) => {
    setAllLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === leadId
          ? { ...lead, ...updates, lastTouchpoint: new Date().toISOString() }
          : lead
      )
    );
  }, []);

  const handleConversationUpdate = useCallback((data: any) => {
    const { leadId, sentiment, messageCount, lastActivity } = data;

    const updates: Partial<SubprimeLead> = {
      lastTouchpoint: lastActivity || new Date().toISOString()
    };

    if (sentiment) updates.sentiment = sentiment;

    if (messageCount !== undefined) {
      updates.conversations = Array.from({ length: messageCount }, (_, i) => ({
        id: `msg-${i}`,
        type: 'system',
        content: `Message ${i + 1}`,
        timestamp: new Date().toISOString(),
        sentBy: i % 2 === 0 ? 'lead' : 'agent'
      }));
    }

    if (messageCount >= 5) {
      updates.scriptProgress = {
        currentStep: 'qualification',
        completedSteps: ['contacted', 'screening']
      };
    } else if (messageCount >= 2) {
      updates.scriptProgress = {
        currentStep: 'screening',
        completedSteps: ['contacted']
      };
    }

    updateLeadInState(leadId, updates);
  }, [updateLeadInState]);

  const loadLeadsFromServer = async () => {
    if (!organization?.id) {
      toast.error('Organization context missing. Please refresh the page.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/subprime/leads?limit=100&organization_id=${organization.id}`);
      const data = await response.json();

      if (data.success) {
        setAllLeads(data.leads);
        setDataSource(data.source);
        setLastRefresh(new Date());

        if (data.source === 'database') {
          toast.success(`Loaded ${data.leads.length} leads from database`);
        }
      }
    } catch (error) {
      console.error('Error loading leads:', error);
      toast.error('Failed to load leads from server');
      setAllLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadUpdate = async (leadId: string, updates: Partial<SubprimeLead>) => {
    setAllLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === leadId
          ? { ...lead, ...updates, lastTouchpoint: new Date().toISOString() }
          : lead
      )
    );

    try {
      const response = await fetch(`/api/subprime/update-lead/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          organization_id: organization?.id,
          updated_by: user?.id
        })
      });

      if (response.ok) {
        toast.success(`Lead updated successfully`);
      } else {
        toast.warning('Lead updated locally, but server sync failed');
      }
    } catch (error) {
      console.error('Error persisting lead update:', error);
      toast.warning('Lead updated locally, but server sync failed');
    }
  };

  const handleLeadAdded = (newLead: SubprimeLead) => {
    setAllLeads(prevLeads => [newLead, ...prevLeads]);
    toast.success(`New lead added successfully`, {
      description: `${newLead.customerName} is now in the subprime pipeline`
    });
  };

  const handleTileClick = (title: string, content: React.ReactNode) => {
    setActiveTileInfo({ title, content });
    setTileDialogOpen(true);
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/subprime/delete-lead?id=${leadId}&organization_id=${organization?.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to delete lead');

      setAllLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));
      toast.success(`Lead deleted successfully`);
    } catch (error) {
      console.error('Error deleting lead:', error);
      const shouldRemoveFromUI = confirm('Failed to delete from server. Remove from view only?');
      if (shouldRemoveFromUI) {
        setAllLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));
        toast.warning('Lead removed from view only');
      } else {
        toast.error(`Failed to delete lead`);
      }
    }
  };

  const handleDeleteAllLeads = async () => {
    if (allLeads.length === 0) {
      toast.info('No leads to delete');
      return;
    }

    if (!confirm(`Delete ALL ${allLeads.length} leads? This cannot be undone.`)) return;

    try {
      const response = await fetch('/api/subprime/clear-test-data', { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to delete all leads');

      setAllLeads([]);
      toast.success(`Deleted all ${result.deletedCount} leads`);
    } catch (error) {
      console.error('Error deleting all leads:', error);
      const shouldClearUI = confirm('Failed to delete from server. Clear from view only?');
      if (shouldClearUI) {
        setAllLeads([]);
        toast.warning('Leads cleared from view only');
      } else {
        toast.error(`Failed to delete all leads`);
      }
    }
  };

  const getTileContent = () => ({
    inProgress: {
      title: "In Progress Leads",
      content: (
        <div className="space-y-4">
          <p>There are currently <span className="font-semibold text-amber-600">{metrics.inProgress}</span> leads in progress.</p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li><span className="font-medium">{allLeads.filter(l => l.scriptProgress.currentStep === "screening").length}</span> in Screening</li>
            <li><span className="font-medium">{allLeads.filter(l => l.scriptProgress.currentStep === "qualification").length}</span> in Qualification</li>
            <li><span className="font-medium">{allLeads.filter(l => l.nextAction.isAutomated).length}</span> in automated follow-up</li>
          </ul>
        </div>
      )
    },
    notReady: {
      title: "Not Ready Leads",
      content: (
        <div className="space-y-4">
          <p><span className="font-semibold text-red-600">{allLeads.filter(l => l.fundingReadiness === "Not Ready").length}</span> leads not ready for funding.</p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li><span className="font-medium">{allLeads.filter(l => l.creditProfile?.knownIssues.includes("Multiple Collections")).length}</span> with collections issues</li>
            <li><span className="font-medium">{allLeads.filter(l => l.creditProfile?.knownIssues.includes("Recent Bankruptcy")).length}</span> with recent bankruptcies</li>
            <li><span className="font-medium">{allLeads.filter(l => l.sentiment === "Ghosted").length}</span> gone silent</li>
          </ul>
        </div>
      )
    },
    needsAction: {
      title: "Needs Action",
      content: (
        <div className="space-y-4">
          <p><span className="font-semibold text-violet-600">{allLeads.filter(l => l.nextAction.isOverdue).length}</span> leads require immediate attention.</p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li><span className="font-medium">{allLeads.filter(l => l.nextAction.isOverdue && l.sentiment === "Frustrated").length}</span> overdue + frustrated</li>
            <li><span className="font-medium">{allLeads.filter(l => l.nextAction.isOverdue && l.chaseStatus === "Manual Review").length}</span> flagged for manual review</li>
            <li><span className="font-medium">{allLeads.filter(l => l.nextAction.isOverdue && l.fundingReadiness === "Partial").length}</span> in progress with missed follow-ups</li>
          </ul>
        </div>
      )
    },
    readyForFunding: {
      title: "Ready for Funding",
      content: (
        <div className="space-y-4">
          <p><span className="font-semibold text-emerald-600">{metrics.readyForFunding}</span> leads ready for financing.</p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li><span className="font-medium">{Math.round(metrics.readyForFunding * 0.4)}</span> traditional financing</li>
            <li><span className="font-medium">{Math.round(metrics.readyForFunding * 0.35)}</span> special programs</li>
            <li><span className="font-medium">{Math.round(metrics.readyForFunding * 0.25)}</span> alternative financing</li>
          </ul>
        </div>
      )
    }
  });

  const kpiCards = [
    {
      label: "In Progress",
      value: metrics.inProgress,
      sub: `${metrics.percentages.inProgress}% of all leads`,
      icon: MessageSquare,
      color: "text-amber-600",
      bg: "bg-amber-50",
      tileKey: "inProgress" as const,
    },
    {
      label: "Not Ready",
      value: metrics.notReady,
      sub: `${metrics.percentages.notReady}% of all leads`,
      icon: Users,
      color: "text-red-600",
      bg: "bg-red-50",
      tileKey: "notReady" as const,
    },
    {
      label: "Needs Action",
      value: metrics.overdueActions,
      sub: `${metrics.overdueActions} overdue`,
      icon: Clock,
      color: "text-violet-600",
      bg: "bg-violet-50",
      tileKey: "needsAction" as const,
    },
    {
      label: "Ready for Funding",
      value: metrics.readyForFunding,
      sub: `${metrics.percentages.readyForFunding}% of all leads`,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      tileKey: "readyForFunding" as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {organization?.name || 'Lead Management'}
            </h1>
            <Badge variant="outline" className="text-xs font-normal">
              {hasRole('admin') ? 'Admin' : hasRole('manager') ? 'Manager' : 'Agent'}
            </Badge>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${autoRefreshEnabled ? 'bg-emerald-500 animate-pulse-subtle' : 'bg-muted-foreground/30'}`} />
              <span className="text-xs text-muted-foreground">
                {autoRefreshEnabled ? 'Live' : 'Manual'}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            <Database className="inline h-3 w-3 mr-1" />
            {dataSource} &middot; {lastRefresh.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-56">
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={handleSearch}
              className="h-9 text-sm"
            />
          </div>

          <Button
            variant={autoRefreshEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className="gap-1.5 h-9"
          >
            <div className={`w-1.5 h-1.5 rounded-full ${autoRefreshEnabled ? 'bg-white' : 'bg-emerald-500'}`} />
            {autoRefreshEnabled ? 'Live' : 'Manual'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadLeadsFromServer}
            disabled={isLoading}
            className="gap-1.5 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {hasPermission('lead:create') && (
            <Button
              onClick={() => setAddLeadDialogOpen(true)}
              size="sm"
              className="gap-1.5 h-9"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Lead
            </Button>
          )}

          {hasRole(['admin', 'manager']) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAllLeads}
              className="gap-1.5 h-9"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
        <TabsList className="h-10">
          <TabsTrigger value="overview" className="text-sm">Lead Overview</TabsTrigger>
          <TabsTrigger value="analytics" className="text-sm">CRM Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((kpi) => (
              <Card
                key={kpi.label}
                className="stat-card cursor-pointer shadow-card hover:shadow-card-hover border border-border"
                onClick={() => handleTileClick(getTileContent()[kpi.tileKey].title, getTileContent()[kpi.tileKey].content)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      {kpi.label}
                      <Info className="h-3 w-3" />
                    </span>
                    <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                      <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold tracking-tight">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters + Leads */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <SubprimeLeadFilters
                leads={allLeads}
                chaseStatus={chaseStatusFilter}
                setChaseStatus={setChaseStatusFilter}
                fundingReadiness={fundingReadinessFilter}
                setFundingReadiness={setFundingReadinessFilter}
                sentiment={sentimentFilter}
                setSentiment={setSentimentFilter}
                scriptProgress={scriptProgressFilter}
                setScriptProgress={setScriptProgressFilter}
                showOverdueOnly={showOverdueOnly}
                setShowOverdueOnly={setShowOverdueOnly}
              />
            </div>

            <div className="lg:col-span-3">
              <SubprimeLeadsList
                leads={filteredLeadsCalculation}
                onLeadUpdate={handleLeadUpdate}
                onLeadDelete={handleDeleteLead}
              />
            </div>
          </div>

          {/* Performance Analytics */}
          <Card className="shadow-card border border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SubprimeAnalytics leads={allLeads} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <RealTimeAnalyticsPanel />
            </div>
            <div className="lg:col-span-3">
              <LeadAnalyticsDashboard />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <SubprimeSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />

      <SubprimeAddLeadDialog
        open={addLeadDialogOpen}
        onOpenChange={setAddLeadDialogOpen}
        onLeadAdded={handleLeadAdded}
      />

      <Dialog open={tileDialogOpen} onOpenChange={setTileDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{activeTileInfo.title}</DialogTitle>
            <DialogDescription>
              Detailed breakdown
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            {activeTileInfo.content}
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
};

export default SubprimeDashboard;

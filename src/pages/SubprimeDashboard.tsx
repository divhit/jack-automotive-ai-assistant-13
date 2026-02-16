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
import { SubprimeAnalytics } from "@/components/subprime/SubprimeAnalytics";
import { SubprimeAddLeadDialog } from "@/components/subprime/SubprimeAddLeadDialog";
import { LeadAnalyticsDashboard } from "@/components/subprime/analytics/LeadAnalyticsDashboard";
import { RealTimeAnalyticsPanel } from "@/components/subprime/analytics/RealTimeAnalyticsPanel";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import {
  BarChart3, Users, MessageSquare, Clock, Info, UserPlus, Database,
  RefreshCw, Trash2, CheckCircle2, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

// Dark theme components
import { DarkLeadListPanel } from "@/components/subprime/dark/DarkLeadListPanel";
import DarkLeadDetailPanel from "@/components/subprime/dark/DarkLeadDetailPanel";
import { DarkConversationThread } from "@/components/subprime/dark/DarkConversationThread";
import { DarkConversationInput } from "@/components/subprime/dark/DarkConversationInput";
import DarkProfileTab from "@/components/subprime/dark/DarkProfileTab";
import DarkAnalyticsTab from "@/components/subprime/dark/DarkAnalyticsTab";
import DarkSettingsTab from "@/components/subprime/dark/DarkSettingsTab";

// Business logic hook
import { useTelephonyInterface } from "@/components/subprime/hooks/useTelephonyInterface";

const SubprimeDashboard = () => {
  const { user, profile, organization, signOut, hasRole, hasPermission } = useAuth();

  const [allLeads, setAllLeads] = useState<SubprimeLead[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tileDialogOpen, setTileDialogOpen] = useState(false);
  const [addLeadDialogOpen, setAddLeadDialogOpen] = useState(false);
  const [activeTileInfo, setActiveTileInfo] = useState<{title: string; content: React.ReactNode}>({
    title: "",
    content: null
  });
  const [activeMainTab, setActiveMainTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [dataSource, setDataSource] = useState<'database' | 'memory'>('memory');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Real-time update state
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval] = useState(60000);

  // Selected lead (lifted to dashboard level for split-pane)
  const [selectedLead, setSelectedLead] = useState<SubprimeLead | null>(null);

  // Organization ID
  const orgId = organization?.id || '';

  // Telephony hook - drives the right panel
  const telephony = useTelephonyInterface(selectedLead, orgId, handleLeadUpdate);

  // Metrics
  const metrics = useMemo(() => {
    const totalLeads = allLeads.length;
    const readyForFunding = allLeads.filter(lead => lead.fundingReadiness === 'Ready').length;
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

    const pct = (value: number) => totalLeads > 0 ? Math.round((value / totalLeads) * 100) : 0;

    return {
      totalLeads,
      readyForFunding,
      notReady,
      inProgress,
      activeChases,
      overdueActions,
      percentages: {
        readyForFunding: pct(readyForFunding),
        notReady: pct(notReady),
        inProgress: pct(inProgress),
        overdueActions: pct(overdueActions)
      }
    };
  }, [allLeads]);

  // Load leads from server
  useEffect(() => {
    if (organization?.id) loadLeadsFromServer();
  }, [organization?.id]);

  // Auto-refresh
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (autoRefreshEnabled && organization?.id) {
      intervalId = setInterval(() => loadLeadsFromServer(), refreshInterval);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
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
        } catch (_) {}
      };
      eventSource.onerror = () => {
        setTimeout(() => {
          if (organization?.id) loadLeadsFromServer();
        }, 5000);
      };
    }
    return () => { if (eventSource) eventSource.close(); };
  }, [organization?.id]);

  const updateLeadInState = useCallback((leadId: string, updates: Partial<SubprimeLead>) => {
    setAllLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === leadId ? { ...lead, ...updates, lastTouchpoint: new Date().toISOString() } : lead
      )
    );
    // Update selected lead if it's the one being updated
    if (selectedLead?.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, ...updates, lastTouchpoint: new Date().toISOString() } : prev);
    }
  }, [selectedLead?.id]);

  const handleConversationUpdate = useCallback((data: any) => {
    const { leadId, sentiment, messageCount, lastActivity } = data;
    const updates: Partial<SubprimeLead> = {
      lastTouchpoint: lastActivity || new Date().toISOString()
    };
    if (sentiment) updates.sentiment = sentiment;
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
    } catch (_) {
      toast.error('Failed to load leads from server');
      setAllLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  function handleLeadUpdate(leadId: string, updates: Partial<SubprimeLead>) {
    setAllLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === leadId ? { ...lead, ...updates, lastTouchpoint: new Date().toISOString() } : lead
      )
    );
    if (selectedLead?.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, ...updates } : prev);
    }
    // Persist to server
    fetch(`/api/subprime/update-lead/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updates,
        organization_id: organization?.id,
        updated_by: user?.id
      })
    }).catch(() => {});
  }

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

  const handleDeleteAllLeads = async () => {
    if (allLeads.length === 0) { toast.info('No leads to delete'); return; }
    if (!confirm(`Delete ALL ${allLeads.length} leads? This cannot be undone.`)) return;
    try {
      const response = await fetch('/api/subprime/clear-test-data', { method: 'DELETE' });
      if (!response.ok) throw new Error('HTTP error');
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed');
      setAllLeads([]);
      setSelectedLead(null);
      toast.success(`Deleted all ${result.deletedCount} leads`);
    } catch (_) {
      toast.error('Failed to delete all leads');
    }
  };

  const handleSelectLead = (lead: SubprimeLead) => {
    setSelectedLead(lead);
  };

  const getTileContent = () => ({
    inProgress: {
      title: "In Progress Leads",
      content: (
        <div className="space-y-4">
          <p>Currently <span className="font-semibold text-amber-400">{metrics.inProgress}</span> leads in progress.</p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300">
            <li>{allLeads.filter(l => l.scriptProgress?.currentStep === "screening").length} in Screening</li>
            <li>{allLeads.filter(l => l.scriptProgress?.currentStep === "qualification").length} in Qualification</li>
            <li>{allLeads.filter(l => l.nextAction?.isAutomated).length} in automated follow-up</li>
          </ul>
        </div>
      )
    },
    notReady: {
      title: "Not Ready Leads",
      content: (
        <div className="space-y-4">
          <p><span className="font-semibold text-red-400">{metrics.notReady}</span> leads not ready for funding.</p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300">
            <li>{allLeads.filter(l => l.sentiment === "Ghosted").length} gone silent</li>
          </ul>
        </div>
      )
    },
    needsAction: {
      title: "Needs Action",
      content: (
        <div className="space-y-4">
          <p><span className="font-semibold text-violet-400">{metrics.overdueActions}</span> leads require immediate attention.</p>
        </div>
      )
    },
    readyForFunding: {
      title: "Ready for Funding",
      content: (
        <div className="space-y-4">
          <p><span className="font-semibold text-emerald-400">{metrics.readyForFunding}</span> leads ready for financing.</p>
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
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      tileKey: "inProgress" as const,
    },
    {
      label: "Not Ready",
      value: metrics.notReady,
      sub: `${metrics.percentages.notReady}% of all leads`,
      icon: Users,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      tileKey: "notReady" as const,
    },
    {
      label: "Needs Action",
      value: metrics.overdueActions,
      sub: `${metrics.overdueActions} overdue`,
      icon: Clock,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      border: "border-violet-500/20",
      tileKey: "needsAction" as const,
    },
    {
      label: "Ready for Funding",
      value: metrics.readyForFunding,
      sub: `${metrics.percentages.readyForFunding}% of all leads`,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      tileKey: "readyForFunding" as const,
    },
  ];

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col">
      {/* Header Bar */}
      <div className="flex-shrink-0 bg-zinc-900 border-b border-zinc-800 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-zinc-100">
              {organization?.name || 'Lead Management'}
            </h1>
            <Badge variant="outline" className="text-[10px] font-normal border-zinc-700 text-zinc-400">
              {hasRole('admin') ? 'Admin' : hasRole('manager') ? 'Manager' : 'Agent'}
            </Badge>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${autoRefreshEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
              <span className="text-[10px] text-zinc-500">
                {autoRefreshEnabled ? 'Live' : 'Manual'}
              </span>
            </div>
            <span className="text-[10px] text-zinc-600">
              <Database className="inline h-3 w-3 mr-0.5" />
              {dataSource} &middot; {lastRefresh.toLocaleTimeString()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className="h-8 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${autoRefreshEnabled ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
              {autoRefreshEnabled ? 'Live' : 'Manual'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={loadLeadsFromServer}
              disabled={isLoading}
              className="h-8 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {hasPermission('lead:create') && (
              <Button
                onClick={() => setAddLeadDialogOpen(true)}
                size="sm"
                className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Add Lead
              </Button>
            )}

            {hasRole(['admin', 'manager']) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteAllLeads}
                className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex-shrink-0 bg-zinc-900 border-b border-zinc-800 px-6">
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
          <TabsList className="bg-transparent h-10">
            <TabsTrigger
              value="overview"
              className="text-zinc-400 data-[state=active]:text-zinc-100 data-[state=active]:bg-zinc-800 data-[state=active]:shadow-none rounded-md px-3 py-1.5 text-sm"
            >
              Lead Overview
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="text-zinc-400 data-[state=active]:text-zinc-100 data-[state=active]:bg-zinc-800 data-[state=active]:shadow-none rounded-md px-3 py-1.5 text-sm"
            >
              CRM Analytics
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content area */}
      {activeMainTab === "overview" ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* KPI Cards Row */}
          <div className="flex-shrink-0 px-6 py-4">
            <div className="grid grid-cols-4 gap-3">
              {kpiCards.map((kpi) => (
                <button
                  key={kpi.label}
                  onClick={() => handleTileClick(getTileContent()[kpi.tileKey].title, getTileContent()[kpi.tileKey].content)}
                  className={`bg-zinc-900 border ${kpi.border} rounded-lg p-4 text-left hover:bg-zinc-800/80 transition-colors`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                      {kpi.label}
                      <Info className="h-3 w-3" />
                    </span>
                    <div className={`w-7 h-7 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                      <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{kpi.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Split-pane: Leads List (left) + Detail Panel (right) */}
          <div className="flex-1 min-h-0">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Left panel: Lead list */}
              <ResizablePanel defaultSize={25} minSize={18} maxSize={40}>
                <DarkLeadListPanel
                  leads={allLeads}
                  selectedLeadId={selectedLead?.id || null}
                  onSelectLead={handleSelectLead}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  onAddLead={() => setAddLeadDialogOpen(true)}
                />
              </ResizablePanel>

              <ResizableHandle withHandle className="bg-zinc-800 hover:bg-zinc-700 transition-colors" />

              {/* Right panel: Lead detail + conversation */}
              <ResizablePanel defaultSize={75}>
                <DarkLeadDetailPanel
                  selectedLead={selectedLead}
                  activeMainTab={telephony.activeMainTab}
                  onTabChange={telephony.setActiveMainTab}
                  isCallActive={telephony.isCallActive}
                  callDuration={telephony.callDuration}
                  isManualCallActive={telephony.isManualCallActive}
                  isUnderHumanControl={telephony.isUnderHumanControl}
                  humanControlAgent={telephony.humanControlAgent}
                  formatDuration={telephony.formatDuration}
                >
                  {/* Conversation tab */}
                  {telephony.activeMainTab === "conversation" && (
                    <div className="flex flex-col h-full">
                      <DarkConversationThread
                        conversationHistory={telephony.conversationHistory}
                        liveTranscripts={telephony.liveTranscripts}
                        isCallActive={telephony.isCallActive}
                        isLoading={telephony.isLoading}
                        messagesEndRef={telephony.messagesEndRef}
                        scrollAreaRef={telephony.scrollAreaRef}
                        showScrollToBottom={telephony.showScrollToBottom}
                        onScrollToBottom={telephony.scrollToBottom}
                      />
                      <DarkConversationInput
                        textInput={telephony.textInput}
                        onTextInputChange={telephony.setTextInput}
                        onSendMessage={telephony.handleSendTextMessage}
                        onStartVoiceCall={telephony.handleStartVoiceCall}
                        onEndCall={telephony.handleEndCall}
                        onManualCall={telephony.handleManualCall}
                        onEndManualCall={telephony.handleEndManualCall}
                        isCallActive={telephony.isCallActive}
                        isManualCallActive={telephony.isManualCallActive}
                        isAutoMode={telephony.isAutoMode}
                        onToggleAutoMode={telephony.setIsAutoMode}
                        isUnderHumanControl={telephony.isUnderHumanControl}
                        onSendHumanMessage={telephony.handleSendHumanMessage}
                        onJoinHumanControl={telephony.handleJoinHumanControl}
                        onLeaveHumanControl={telephony.handleLeaveHumanControl}
                        humanControlAgent={telephony.humanControlAgent}
                        currentMode={telephony.currentMode}
                      />
                    </div>
                  )}

                  {/* Profile tab */}
                  {telephony.activeMainTab === "profile" && (
                    <DarkProfileTab
                      profileFormData={telephony.profileFormData}
                      onFieldChange={telephony.debouncedSaveProfile}
                      isSaving={telephony.isSaving}
                      saveStatus={telephony.saveStatus}
                    />
                  )}

                  {/* Analytics tab */}
                  {telephony.activeMainTab === "analytics" && (
                    <DarkAnalyticsTab
                      analyticsData={telephony.analyticsData}
                      conversationHistory={telephony.conversationHistory}
                    />
                  )}

                  {/* Settings tab */}
                  {telephony.activeMainTab === "settings" && (
                    <DarkSettingsTab
                      agentName={telephony.agentName}
                      onAgentNameChange={telephony.setAgentName}
                      agentPhoneNumber={telephony.agentPhoneNumber}
                      onAgentPhoneChange={telephony.setAgentPhoneNumber}
                      settingsData={telephony.settingsData}
                      onSettingChange={telephony.handleSettingChange}
                      isAutoMode={telephony.isAutoMode}
                      onToggleAutoMode={telephony.setIsAutoMode}
                    />
                  )}
                </DarkLeadDetailPanel>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      ) : (
        /* CRM Analytics tab */
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
                <RealTimeAnalyticsPanel />
              </div>
            </div>
            <div className="lg:col-span-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
                <LeadAnalyticsDashboard />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <SubprimeAddLeadDialog
        open={addLeadDialogOpen}
        onOpenChange={setAddLeadDialogOpen}
        onLeadAdded={handleLeadAdded}
      />

      <Dialog open={tileDialogOpen} onOpenChange={setTileDialogOpen}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">{activeTileInfo.title}</DialogTitle>
            <DialogDescription className="text-zinc-400">Detailed breakdown</DialogDescription>
          </DialogHeader>
          <div className="mt-2">{activeTileInfo.content}</div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
};

export default SubprimeDashboard;

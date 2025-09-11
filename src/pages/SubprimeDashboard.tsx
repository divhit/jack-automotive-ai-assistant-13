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
import { Separator } from "@/components/ui/separator";
import { subprimeLeads } from "@/data";
import { SubprimeLeadFilters } from "@/components/subprime/SubprimeLeadFilters";
import { SubprimeAnalytics } from "@/components/subprime/SubprimeAnalytics";
import { SubprimeLeadsList } from "@/components/subprime/SubprimeLeadsList";
import { SubprimeAddLeadDialog } from "@/components/subprime/SubprimeAddLeadDialog";
import { LeadAnalyticsDashboard } from "@/components/subprime/analytics/LeadAnalyticsDashboard";
import { RealTimeAnalyticsPanel } from "@/components/subprime/analytics/RealTimeAnalyticsPanel";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { BarChart3, Users, MessageSquare, Clock, Info, Settings, Sliders, UserPlus, Database, RefreshCw, Trash2, Brain, Target, Building2, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubprimeSettingsDialog } from "@/components/subprime/SubprimeSettingsDialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SubprimeDashboard = () => {
  const { user, profile, organization, signOut, hasRole, hasPermission } = useAuth();
  
  // Debug permissions for button visibility
  useEffect(() => {
    console.log('🔍 DEBUG: Button visibility check:', {
      user: user?.email,
      profile: profile ? {
        role: profile.role,
        id: profile.id,
        organization_id: profile.organization_id
      } : null,
      organization: organization ? {
        name: organization.name,
        id: organization.id
      } : null,
      permissions: {
        hasCreatePermission: hasPermission('lead:create'),
        hasAdminRole: hasRole('admin'),
        hasManagerRole: hasRole('manager'),
        hasAdminOrManager: hasRole(['admin', 'manager'])
      }
    });
  }, [user, profile, organization, hasPermission, hasRole]);
  
  const [allLeads, setAllLeads] = useState<SubprimeLead[]>([]);  // Start empty - only load organization-specific data
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
  
  // Filter states (moved from SubprimeLeadFilters to parent)
  const [chaseStatusFilter, setChaseStatusFilter] = useState<string>("all");
  const [fundingReadinessFilter, setFundingReadinessFilter] = useState<string>("all");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [scriptProgressFilter, setScriptProgressFilter] = useState<string>("all");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  // Real-time update state
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60000); // 60 seconds - reduced frequency

  // Enhanced metrics calculation with better error handling and proper KPI tracking
  const metrics = useMemo(() => {
    const totalLeads = allLeads.length;
    const readyForFunding = allLeads.filter(lead => lead.fundingReadiness === 'Ready').length;
    const partialFunding = allLeads.filter(lead => lead.fundingReadiness === 'Partial').length;
    const notReady = allLeads.filter(lead => lead.fundingReadiness === 'Not Ready').length;
    const activeChases = allLeads.filter(lead => lead.chaseStatus === 'Auto Chase Running').length;
    const overdueActions = allLeads.filter(lead => lead.nextAction?.isOverdue).length;
    
    // FIXED: In Progress should be leads actively being worked on (have recent activity or are in chase)
    const inProgress = allLeads.filter(lead => {
      const hasRecentActivity = lead.lastTouchpoint && 
        new Date(lead.lastTouchpoint) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
      const isActivelyChased = lead.chaseStatus === 'Auto Chase Running';
      const isInQualification = lead.scriptProgress?.currentStep === 'qualification' || 
                               lead.scriptProgress?.currentStep === 'screening';
      return hasRecentActivity || isActivelyChased || isInQualification;
    }).length;
    
    // Calculate percentages with safe division
    const calculatePercentage = (value: number, total: number) => {
      return total > 0 ? Math.round((value / total) * 100) : 0;
    };
    
    // Log metrics for real-time tracking
    console.log('📊 CRM KPIs Updated:', {
      totalLeads,
      inProgress,
      notReady,
      overdueActions,
      readyForFunding,
      timestamp: new Date().toISOString()
    });
    
    return {
      totalLeads,
      readyForFunding,
      partialFunding,
      notReady,
      inProgress,
      activeChases,
      overdueActions,
      // Safe percentage calculations
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
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
  };

  // Enhanced filtering logic that combines search and filters
  const filteredLeadsCalculation = useMemo(() => {
    let filtered = [...allLeads];
    
    // Apply search filter
    if (searchTerm !== "") {
      filtered = filtered.filter(lead => 
        lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        lead.phoneNumber.includes(searchTerm)
      );
    }
    
    // Apply chase status filter
    if (chaseStatusFilter !== "all") {
      filtered = filtered.filter(lead => lead.chaseStatus === chaseStatusFilter);
    }
    
    // Apply funding readiness filter
    if (fundingReadinessFilter !== "all") {
      filtered = filtered.filter(lead => lead.fundingReadiness === fundingReadinessFilter);
    }
    
    // Apply sentiment filter
    if (sentimentFilter !== "all") {
      filtered = filtered.filter(lead => lead.sentiment === sentimentFilter);
    }
    
    // Apply script progress filter
    if (scriptProgressFilter !== "all") {
      filtered = filtered.filter(lead => lead.scriptProgress.currentStep === scriptProgressFilter);
    }
    
    // Apply overdue filter
    if (showOverdueOnly) {
      filtered = filtered.filter(lead => lead.nextAction?.isOverdue);
    }
    
    return filtered;
  }, [allLeads, searchTerm, chaseStatusFilter, fundingReadinessFilter, sentimentFilter, scriptProgressFilter, showOverdueOnly]);

  // Simplified filter change handler (no longer modifies allLeads)
  const handleFilterChange = useCallback(() => {
    // Filters are now handled by the useMemo above
    // This function is kept for compatibility but doesn't need to do anything
    console.log(`🔍 Filters updated: showing ${filteredLeadsCalculation.length} of ${allLeads.length} leads`);
  }, [filteredLeadsCalculation.length, allLeads.length]);

  // Load leads from server on component mount
  useEffect(() => {
    if (organization?.id) {
      loadLeadsFromServer();
    }
  }, [organization?.id]);

  // Auto-refresh effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (autoRefreshEnabled && organization?.id) {
      intervalId = setInterval(() => {
        console.log('🔄 Auto-refreshing dashboard data...');
        loadLeadsFromServer();
      }, refreshInterval);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefreshEnabled, refreshInterval, organization?.id]);

  // KPI Change Watcher - Track significant changes in real-time
  useEffect(() => {
    const prevMetrics = JSON.parse(localStorage.getItem('prevKPIMetrics') || '{}');
    const currentMetrics = {
      inProgress: metrics.inProgress,
      notReady: metrics.notReady,
      overdueActions: metrics.overdueActions,
      readyForFunding: metrics.readyForFunding,
      totalLeads: metrics.totalLeads
    };
    
    // Check for significant changes
    const hasSignificantChange = Object.keys(currentMetrics).some(key => 
      Math.abs(currentMetrics[key] - (prevMetrics[key] || 0)) > 0
    );
    
    if (hasSignificantChange) {
      console.log('📊 KPI CHANGE DETECTED:', {
        previous: prevMetrics,
        current: currentMetrics,
        changes: Object.keys(currentMetrics).reduce((acc, key) => {
          const prev = prevMetrics[key] || 0;
          const curr = currentMetrics[key];
          if (prev !== curr) {
            acc[key] = { from: prev, to: curr, delta: curr - prev };
          }
          return acc;
        }, {})
      });
    }
    
    // Store current metrics for next comparison
    localStorage.setItem('prevKPIMetrics', JSON.stringify(currentMetrics));
  }, [metrics]);

  // Real-time updates via Server-Sent Events
  useEffect(() => {
    let eventSource: EventSource | null = null;
    
    if (organization?.id) {
      // Connect to SSE endpoint for real-time updates
      eventSource = new EventSource(`/api/analytics/stream?organizationId=${organization.id}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'lead_update') {
            console.log('📡 Received real-time lead update:', data);
            updateLeadInState(data.leadId, data.updates);
          } else if (data.type === 'conversation_update') {
            console.log('📡 Received real-time conversation update:', data);
            handleConversationUpdate(data);
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        // Reconnect after a delay
        setTimeout(() => {
          if (organization?.id) {
            loadLeadsFromServer();
          }
        }, 5000);
      };
    }
    
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [organization?.id]);

  // Update lead in state (real-time updates)
  const updateLeadInState = useCallback((leadId: string, updates: Partial<SubprimeLead>) => {
    setAllLeads(prevLeads => {
      const updatedLeads = prevLeads.map(lead => 
        lead.id === leadId 
          ? { ...lead, ...updates, lastTouchpoint: new Date().toISOString() }
          : lead
      );
      
      // Broadcast KPI update to other components
      console.log('📊 KPI Data Updated - Broadcasting to connected components');
      
      return updatedLeads;
    });
  }, []);

  // Handle conversation updates from real-time events
  const handleConversationUpdate = useCallback((data: any) => {
    const { leadId, phoneNumber, sentiment, messageCount, lastActivity } = data;
    
    // Update lead based on conversation progress
    const updates: Partial<SubprimeLead> = {
      lastTouchpoint: lastActivity || new Date().toISOString()
    };
    
    // Update sentiment if provided
    if (sentiment) {
      updates.sentiment = sentiment;
    }
    
    // Update conversation count
    if (messageCount !== undefined) {
      updates.conversations = Array.from({ length: messageCount }, (_, i) => ({
        id: `msg-${i}`,
        type: 'system',
        content: `Message ${i + 1}`,
        timestamp: new Date().toISOString(),
        sentBy: i % 2 === 0 ? 'lead' : 'agent'
      }));
    }
    
    // Auto-update lead status based on conversation progress
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
      console.error('🚨 SECURITY: No organization context available - cannot load leads to prevent cross-organization data leakage');
      toast.error('Organization context missing. Please refresh the page.');
      return;
    }

    setIsLoading(true);
    try {
      // Include organization context in the API call
      const response = await fetch(`/api/subprime/leads?limit=100&organization_id=${organization.id}`);
      const data = await response.json();
      
      if (data.success) {
        setAllLeads(data.leads);
        setDataSource(data.source);
        setLastRefresh(new Date());
        console.log(`📊 Loaded ${data.leads.length} leads from ${data.source} for org: ${organization.name} (${organization.id})`);
        
        if (data.source === 'database') {
          toast.success(`Loaded ${data.leads.length} leads from database`);
        }
      }
    } catch (error) {
      console.error('Error loading leads:', error);
      toast.error('Failed to load leads from server');
      // Don't fall back to static data - could be from wrong organization
      setAllLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadUpdate = async (leadId: string, updates: Partial<SubprimeLead>) => {
    // Update the lead in the main leads array
    setAllLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === leadId 
          ? { ...lead, ...updates, lastTouchpoint: new Date().toISOString() }
          : lead
      )
    );

    // Note: filteredLeads will automatically update via useMemo

    // Persist changes to server with organization context
    try {
      const response = await fetch(`/api/subprime/update-lead/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ...updates,
          organization_id: organization?.id,
          updated_by: user?.id
        })
      });

      if (response.ok) {
        toast.success(`Lead ${leadId} updated successfully`);
      } else {
        console.warn('Failed to persist lead update to server');
        toast.warning('Lead updated locally, but server sync failed');
      }
    } catch (error) {
      console.error('Error persisting lead update:', error);
      toast.warning('Lead updated locally, but server sync failed');
    }
  };

  const handleLeadAdded = (newLead: SubprimeLead) => {
    console.log('📝 Adding new lead to dashboard:', {
      id: newLead.id,
      customerName: newLead.customerName,
      phoneNumber: newLead.phoneNumber,
      fundingReadiness: newLead.fundingReadiness,
      sentiment: newLead.sentiment,
      organization: organization?.name
    });

    // Add to main leads array
    setAllLeads(prevLeads => [newLead, ...prevLeads]);
    
    // Add to filtered leads if it matches current search/filter
    const matchesSearch = searchTerm === "" || 
      newLead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      newLead.phoneNumber.includes(searchTerm);
      
    // Note: filteredLeads will automatically update via useMemo when allLeads changes

    // No need to make API call here as SubprimeAddLeadDialog handles it
    toast.success(`New lead added successfully`, {
      description: `${newLead.customerName} is now in the subprime pipeline and ready for telephony integration`
    });
  };

  const handleTileClick = (title: string, content: React.ReactNode) => {
    setActiveTileInfo({ title, content });
    setTileDialogOpen(true);
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return;
    }

    try {
      console.log(`🗑️ Deleting lead ${leadId}...`);
      
      // Use API endpoint for consistency with other operations
      const response = await fetch(`/api/subprime/delete-lead?id=${leadId}&organization_id=${organization?.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete lead');
      }
      
      console.log(`✅ Lead ${leadId} deleted successfully`);
      
      // Update local state after successful deletion
      setAllLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));
      
      toast.success(`Lead deleted successfully`);
      
    } catch (error) {
      console.error('❌ Error deleting lead:', error);
      
      // If deletion fails, still offer to remove from UI
      const shouldRemoveFromUI = confirm(
        'Failed to delete from server. Remove from view only? (Lead will reappear on refresh)'
      );
      
      if (shouldRemoveFromUI) {
        setAllLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));
        toast.warning('Lead removed from view only (server deletion failed)');
      } else {
        toast.error(`Failed to delete lead: ${error.message}`);
      }
    }
  };

  const handleDeleteAllLeads = async () => {
    const currentLeadCount = allLeads.length;
    
    if (currentLeadCount === 0) {
      toast.info('No leads to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ALL ${currentLeadCount} leads? This action cannot be undone and will delete all leads from the database.`)) {
      return;
    }

    try {
      console.log(`🗑️ Deleting all leads...`);
      
      // Use API endpoint for consistency
      const response = await fetch('/api/subprime/clear-test-data', {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete all leads');
      }
      
      console.log(`✅ Deleted ${result.deletedCount} leads successfully`);
      
      // Clear local state after successful deletion
      setAllLeads([]);
      
      toast.success(`Deleted all ${result.deletedCount} leads successfully`);
      
    } catch (error) {
      console.error('❌ Error deleting all leads:', error);
      
      // If deletion fails, still offer to clear UI
      const shouldClearUI = confirm(
        'Failed to delete from server. Clear from view only? (Leads will reappear on refresh)'
      );
      
      if (shouldClearUI) {
        setAllLeads([]);
        toast.warning('Leads cleared from view only (server deletion failed)');
      } else {
        toast.error(`Failed to delete all leads: ${error.message}`);
      }
    }
  };

  // Use allLeads for tile calculations to ensure real-time updates
  const getTileContent = () => {
    return {
      inProgress: {
        title: "In Progress Leads",
        content: (
          <div className="space-y-4">
            <p>There are currently <span className="font-bold text-yellow-600">{metrics.readyForFunding}</span> leads in progress.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><span className="font-semibold">{allLeads.filter(l => l.scriptProgress.currentStep === "screening").length}</span> leads in Screening stage</li>
              <li><span className="font-semibold">{allLeads.filter(l => l.scriptProgress.currentStep === "qualification").length}</span> leads in Qualification stage</li>
              <li><span className="font-semibold">{allLeads.filter(l => l.nextAction.isAutomated).length}</span> leads in automated follow-up sequences</li>
            </ul>
            <p className="text-sm text-gray-600 mt-4">Most leads require income verification (64%) or credit documentation (27%).</p>
          </div>
        )
      },
      notReady: {
        title: "Not Ready Leads",
        content: (
          <div className="space-y-4">
            <p>There are <span className="font-bold text-red-600">{allLeads.filter(l => l.fundingReadiness === "Not Ready").length}</span> leads that are not ready for funding.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><span className="font-semibold">{allLeads.filter(l => l.creditProfile?.knownIssues.includes("Multiple Collections")).length}</span> with major collections issues</li>
              <li><span className="font-semibold">{allLeads.filter(l => l.creditProfile?.knownIssues.includes("Recent Bankruptcy")).length}</span> with recent bankruptcies</li>
              <li><span className="font-semibold">{allLeads.filter(l => l.sentiment === "Ghosted").length}</span> leads have gone silent (no response in 72+ hours)</li>
            </ul>
            <p className="text-sm text-gray-600 mt-4">Focus areas: Credit repair education (38%), Income verification (24%), Alternative financing options (18%)</p>
          </div>
        )
      },
      needsAction: {
        title: "Needs Action Leads",
        content: (
          <div className="space-y-4">
            <p><span className="font-bold text-purple-600">{allLeads.filter(l => l.nextAction.isOverdue).length}</span> leads require immediate attention.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><span className="font-semibold">{allLeads.filter(l => l.nextAction.isOverdue && l.sentiment === "Frustrated").length}</span> overdue and showing frustration</li>
              <li><span className="font-semibold">{allLeads.filter(l => l.nextAction.isOverdue && l.chaseStatus === "Manual Review").length}</span> flagged for manual review</li>
              <li><span className="font-semibold">{allLeads.filter(l => l.nextAction.isOverdue && l.fundingReadiness === "Partial").length}</span> in progress leads with missed follow-ups</li>
            </ul>
            <p className="text-sm text-gray-600 mt-4">Priority contacts: Manual Review (48%), Document Collection (37%), Credit Verification (15%)</p>
          </div>
        )
      },
      readyForFunding: {
        title: "Ready for Funding Leads",
        content: (
          <div className="space-y-4">
            <p><span className="font-bold text-green-600">{metrics.readyForFunding}</span> leads are ready for financing.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><span className="font-semibold">{Math.round(metrics.readyForFunding * 0.4)}</span> ready for traditional financing</li>
              <li><span className="font-semibold">{Math.round(metrics.readyForFunding * 0.35)}</span> qualified for special programs</li>
              <li><span className="font-semibold">{Math.round(metrics.readyForFunding * 0.25)}</span> ready for alternative financing</li>
            </ul>
            <p className="text-sm text-gray-600 mt-4">Average time to funding ready: 3.2 days (20% faster than last month)</p>
          </div>
        )
      }
    };
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Successfully signed out");
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error("Failed to sign out");
    }
  };

  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (profile?.email) {
      return profile.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.email) {
      return profile.email;
    }
    return "User";
  };

  // Debug logging for permissions
  useEffect(() => {
    console.log('🔍 DEBUG: SubprimeDashboard permissions check:', {
      user: user?.email,
      profile: profile?.role,
      organization: organization?.name,
      hasCreatePermission: hasPermission('lead:create'),
      hasAdminRole: hasRole('admin'),
      hasManagerRole: hasRole('manager'),
      hasAdminOrManager: hasRole(['admin', 'manager']),
      allPermissions: profile ? {
        role: profile.role,
        // Test all permissions
        read: hasPermission('read'),
        write: hasPermission('write'),
        delete: hasPermission('delete'),
        leadCreate: hasPermission('lead:create'),
        leadUpdate: hasPermission('lead:update'),
        leadDelete: hasPermission('lead:delete'),
        manageUsers: hasPermission('manage_users'),
        manageSettings: hasPermission('manage_settings')
      } : 'No profile loaded'
    });
  }, [user, profile, organization, hasPermission, hasRole]);

  return (
    <div className="space-y-6">
      {/* Organization & User Header */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{organization?.name || 'Subprime Dashboard'}</h1>
              <p className="text-sm text-muted-foreground">
                {profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1).replace('_', ' ') : 'Agent'} Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Database className="h-4 w-4" />
            <span>Data: {dataSource}</span>
            <span>•</span>
            <span>Updated: {lastRefresh.toLocaleTimeString()}</span>
          </div>
        </div>
        
        {/* User Profile Dropdown */}
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url} alt={getUserDisplayName()} />
                  <AvatarFallback className="bg-blue-600 text-white">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSettingsDialogOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Lead Management</h2>
          <Badge variant="outline" className="text-xs">
            {hasRole('admin') ? 'Admin Access' : hasRole('manager') ? 'Manager Access' : 'Agent Access'}
          </Badge>
          {/* Real-time status indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${autoRefreshEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-xs text-muted-foreground">
              {autoRefreshEnabled ? 'Live Updates' : 'Manual Refresh'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64">
            <Input 
              placeholder="Search leads..." 
              value={searchTerm} 
              onChange={handleSearch}
              className="w-full"
            />
          </div>

          {/* Real-time toggle */}
          <Button
            variant={autoRefreshEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className="gap-2"
          >
            <div className={`w-2 h-2 rounded-full ${autoRefreshEnabled ? 'bg-white' : 'bg-green-500'}`}></div>
            {autoRefreshEnabled ? 'Live' : 'Manual'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadLeadsFromServer}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {hasPermission('lead:create') && (
            <Button
              onClick={() => setAddLeadDialogOpen(true)}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add Lead
            </Button>
          )}

          {hasRole(['admin', 'manager']) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAllLeads}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete All Leads
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Lead Overview</TabsTrigger>
          <TabsTrigger value="analytics">CRM Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6 mt-6">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:bg-gray-50 transition-colors" 
          onClick={() => handleTileClick("In Progress Leads", getTileContent().inProgress.content)}
        >
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <span>In Progress</span>
              <Info className="h-3.5 w-3.5 ml-1 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold">{metrics.inProgress}</div>
              <div className="bg-yellow-100 p-1.5 rounded-full">
                <MessageSquare className="h-3.5 w-3.5 text-yellow-600" />
              </div>
            </div>
            <div className="flex items-center mt-3 text-xs">
              <span className="text-muted-foreground">{metrics.percentages.inProgress}% of all leads</span>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => handleTileClick("Not Ready Leads", getTileContent().notReady.content)}
        >
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <span>Not Ready</span>
              <Info className="h-3.5 w-3.5 ml-1 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold">{metrics.notReady}</div>
              <div className="bg-red-100 p-1.5 rounded-full">
                <Users className="h-3.5 w-3.5 text-red-600" />
              </div>
            </div>
            <div className="flex items-center mt-3 text-xs">
              <span className="text-muted-foreground">{metrics.percentages.notReady}% of all leads</span>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => handleTileClick("Needs Action Leads", getTileContent().needsAction.content)}
        >
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <span>Needs Action</span>
              <Info className="h-3.5 w-3.5 ml-1 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold">{metrics.overdueActions}</div>
              <div className="bg-purple-100 p-1.5 rounded-full">
                <Clock className="h-3.5 w-3.5 text-purple-600" />
              </div>
            </div>
            <Badge variant="outline" className="mt-3 text-xs bg-red-50 text-red-700 border-red-200">
              {metrics.overdueActions} overdue actions
            </Badge>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => handleTileClick("Ready for Funding Leads", getTileContent().readyForFunding.content)}
        >
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <span>Ready for Funding</span>
              <Info className="h-3.5 w-3.5 ml-1 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold">{metrics.readyForFunding}</div>
              <div className="bg-green-100 p-1.5 rounded-full">
                <Users className="h-3.5 w-3.5 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-3 text-xs">
              <span className="text-muted-foreground">{metrics.percentages.readyForFunding}% of all leads</span>
            </div>
          </CardContent>
        </Card>
      </div>

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

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-automotive-primary" />
                <span>Performance Analytics</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SubprimeAnalytics leads={allLeads} />
          </CardContent>
        </Card>
      </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Core Metrics - Condensed */}
            <div className="lg:col-span-1">
              <RealTimeAnalyticsPanel />
            </div>
            
            {/* Lead Performance Summary */}
            <div className="lg:col-span-3">
              <LeadAnalyticsDashboard />
            </div>
          </div>
        </TabsContent>
      </Tabs>

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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{activeTileInfo.title}</DialogTitle>
            <DialogDescription>
              Detailed breakdown of this metric
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {activeTileInfo.content}
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
};

export default SubprimeDashboard;



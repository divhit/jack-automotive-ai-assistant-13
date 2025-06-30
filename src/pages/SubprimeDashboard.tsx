import { useState, useEffect, useMemo } from "react";
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
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { BarChart3, Users, MessageSquare, Clock, Info, Settings, Sliders, UserPlus, Database, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubprimeSettingsDialog } from "@/components/subprime/SubprimeSettingsDialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

const SubprimeDashboard = () => {
  const [allLeads, setAllLeads] = useState<SubprimeLead[]>(subprimeLeads);
  const [filteredLeads, setFilteredLeads] = useState<SubprimeLead[]>(subprimeLeads);
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
  
  // Calculate metrics from current leads state - wrapped in useMemo to prevent infinite loops
  const metrics = useMemo(() => {
    const readyLeads = allLeads.filter(lead => lead.fundingReadiness === "Ready").length;
    const partialLeads = allLeads.filter(lead => lead.fundingReadiness === "Partial").length;
    const notReadyLeads = allLeads.filter(lead => lead.fundingReadiness === "Not Ready").length;
    const needsActionLeads = allLeads.filter(lead => lead.nextAction.isOverdue).length;
    const totalLeads = allLeads.length;
    
    return {
      readyLeads,
      partialLeads,
      notReadyLeads,
      needsActionLeads,
      totalLeads
    };
  }, [allLeads]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
  };

  // Separate useEffect to handle filtering based on search term and allLeads changes
  useEffect(() => {
    if (searchTerm === "") {
      setFilteredLeads(allLeads);
    } else {
      const filtered = allLeads.filter(lead => 
        lead.customerName.toLowerCase().includes(searchTerm) || 
        lead.phoneNumber.includes(searchTerm)
      );
      setFilteredLeads(filtered);
    }
  }, [allLeads, searchTerm]);

  const handleFilterChange = (filteredLeads: SubprimeLead[]) => {
    setFilteredLeads(filteredLeads);
  };

  // Load leads from server on component mount
  useEffect(() => {
    loadLeadsFromServer();
  }, []);

  const loadLeadsFromServer = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/subprime/leads?limit=100');
      const data = await response.json();
      
      if (data.success) {
        setAllLeads(data.leads);
        setFilteredLeads(data.leads);
        setDataSource(data.source);
        setLastRefresh(new Date());
        console.log(`📊 Loaded ${data.leads.length} leads from ${data.source}`);
        
        if (data.source === 'database') {
          toast.success(`Loaded ${data.leads.length} leads from database`);
        }
      }
    } catch (error) {
      console.error('Error loading leads:', error);
      toast.error('Failed to load leads from server, using local data');
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

    // Update filtered leads as well
    setFilteredLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === leadId 
          ? { ...lead, ...updates, lastTouchpoint: new Date().toISOString() }
          : lead
      )
    );

    // Persist changes to server
    try {
      const response = await fetch('/api/subprime/update-lead', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadId, updates })
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
      sentiment: newLead.sentiment
    });

    // Add to main leads array
    setAllLeads(prevLeads => [newLead, ...prevLeads]);
    
    // Add to filtered leads if it matches current search/filter
    const matchesSearch = searchTerm === "" || 
      newLead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      newLead.phoneNumber.includes(searchTerm);
      
    if (matchesSearch) {
      setFilteredLeads(prevLeads => [newLead, ...prevLeads]);
    }

    // No need to make API call here as SubprimeAddLeadDialog handles it
    toast.success(`New lead added successfully`, {
      description: `${newLead.customerName} is now in the subprime pipeline and ready for telephony integration`
    });
  };

  const handleTileClick = (title: string, content: React.ReactNode) => {
    setActiveTileInfo({ title, content });
    setTileDialogOpen(true);
  };

  const handleDeleteLead = (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return;
    }

    try {
      console.log(`🗑️ Deleting lead ${leadId} directly from memory...`);
      
      // Direct memory deletion - import and modify the subprimeLeads array
      import('@/data/subprime/subprimeLeads').then(({ subprimeLeads }) => {
        const leadIndex = subprimeLeads.findIndex((lead: any) => lead.id === leadId);
        
        if (leadIndex !== -1) {
          subprimeLeads.splice(leadIndex, 1);
          console.log(`✅ Lead ${leadId} removed from memory array`);
        }
      }).catch(() => {
        console.warn('Could not modify memory array directly');
      });
      
      // Update local state immediately (this is the main deletion)
      setAllLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));
      setFilteredLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));
      
      console.log(`✅ Lead ${leadId} deleted successfully`);
      toast.success(`Lead deleted successfully`);
      
    } catch (error) {
      console.error('❌ Error deleting lead:', error);
      toast.error(`Failed to delete lead: ${error.message}`);
    }
  };

  const handleDeleteAllLeads = () => {
    const currentLeadCount = allLeads.length;
    
    if (currentLeadCount === 0) {
      toast.info('No leads to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ALL ${currentLeadCount} leads? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log(`🗑️ Deleting all ${currentLeadCount} leads directly from memory...`);
      
      // Direct memory deletion - clear the entire subprimeLeads array
      import('@/data/subprime/subprimeLeads').then(({ subprimeLeads }) => {
        subprimeLeads.splice(0); // Clear the entire array
        console.log(`✅ All leads cleared from memory array`);
      }).catch(() => {
        console.warn('Could not modify memory array directly');
      });
      
      // Clear local state (this is the main deletion)
      setAllLeads([]);
      setFilteredLeads([]);
      
      console.log(`✅ All ${currentLeadCount} leads deleted successfully`);
      toast.success(`Deleted all ${currentLeadCount} leads successfully`);
      
    } catch (error) {
      console.error('❌ Error deleting all leads:', error);
      
      // If memory deletion fails, still clear frontend state
      setAllLeads([]);
      setFilteredLeads([]);
      
      toast.warning(`Cleared ${currentLeadCount} leads from view`);
    }
  };

  // Use allLeads for tile calculations to ensure real-time updates
  const getTileContent = () => {
    return {
      inProgress: {
        title: "In Progress Leads",
        content: (
          <div className="space-y-4">
            <p>There are currently <span className="font-bold text-yellow-600">{metrics.partialLeads}</span> leads in progress.</p>
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
            <p>There are <span className="font-bold text-red-600">{metrics.notReadyLeads}</span> leads that are not ready for funding.</p>
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
            <p><span className="font-bold text-purple-600">{metrics.needsActionLeads}</span> leads require immediate attention.</p>
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
            <p><span className="font-bold text-green-600">{metrics.readyLeads}</span> leads are ready for financing.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><span className="font-semibold">{Math.round(metrics.readyLeads * 0.4)}</span> ready for traditional financing</li>
              <li><span className="font-semibold">{Math.round(metrics.readyLeads * 0.35)}</span> qualified for special programs</li>
              <li><span className="font-semibold">{Math.round(metrics.readyLeads * 0.25)}</span> ready for alternative financing</li>
            </ul>
            <p className="text-sm text-gray-600 mt-4">Average time to funding ready: 3.2 days (20% faster than last month)</p>
          </div>
        )
      }
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Subprime Dashboard</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Database className="h-4 w-4" />
            <span>Data: {dataSource}</span>
            <span>•</span>
            <span>Updated: {lastRefresh.toLocaleTimeString()}</span>
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

          <Button
            onClick={() => setAddLeadDialogOpen(true)}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add Lead
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteAllLeads}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete All Leads
          </Button>

          <Button 
            variant="outline" 
            size="icon" 
            className="h-9 w-9"
            onClick={() => setSettingsDialogOpen(true)}
          >
            <Sliders className="h-5 w-5" />
          </Button>
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
              <div className="text-xl font-bold">{metrics.partialLeads}</div>
              <div className="bg-yellow-100 p-1.5 rounded-full">
                <MessageSquare className="h-3.5 w-3.5 text-yellow-600" />
              </div>
            </div>
            <div className="flex items-center mt-3 text-xs">
              <span className="text-muted-foreground">{Math.round((metrics.partialLeads / metrics.totalLeads) * 100)}% of all leads</span>
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
              <div className="text-xl font-bold">{metrics.notReadyLeads}</div>
              <div className="bg-red-100 p-1.5 rounded-full">
                <Users className="h-3.5 w-3.5 text-red-600" />
              </div>
            </div>
            <div className="flex items-center mt-3 text-xs">
              <span className="text-muted-foreground">{Math.round((metrics.notReadyLeads / metrics.totalLeads) * 100)}% of all leads</span>
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
              <div className="text-xl font-bold">{metrics.needsActionLeads}</div>
              <div className="bg-purple-100 p-1.5 rounded-full">
                <Clock className="h-3.5 w-3.5 text-purple-600" />
              </div>
            </div>
            <Badge variant="outline" className="mt-3 text-xs bg-red-50 text-red-700 border-red-200">
              {metrics.needsActionLeads} overdue actions
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
              <div className="text-xl font-bold">{metrics.readyLeads}</div>
              <div className="bg-green-100 p-1.5 rounded-full">
                <Users className="h-3.5 w-3.5 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-3 text-xs">
              <span className="text-muted-foreground">{Math.round((metrics.readyLeads / metrics.totalLeads) * 100)}% of all leads</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <SubprimeLeadFilters onFilterChange={handleFilterChange} leads={allLeads} />
        </div>
        
        <div className="lg:col-span-3">
          <SubprimeLeadsList 
            leads={filteredLeads} 
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
          <LeadAnalyticsDashboard />
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



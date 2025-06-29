import { useState } from "react";
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
import { subprimeLeads } from "@/data";
import { SubprimeLeadFilters } from "@/components/subprime/SubprimeLeadFilters";
import { SubprimeAnalytics } from "@/components/subprime/SubprimeAnalytics";
import { SubprimeLeadsList } from "@/components/subprime/SubprimeLeadsList";
import { SubprimeAddLeadDialog } from "@/components/subprime/SubprimeAddLeadDialog";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { BarChart3, Users, MessageSquare, Clock, Info, Settings, Sliders, UserPlus } from "lucide-react";
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
  
  // Calculate metrics from current leads state
  const readyLeads = allLeads.filter(lead => lead.fundingReadiness === "Ready").length;
  const partialLeads = allLeads.filter(lead => lead.fundingReadiness === "Partial").length;
  const notReadyLeads = allLeads.filter(lead => lead.fundingReadiness === "Not Ready").length;
  const needsActionLeads = allLeads.filter(lead => lead.nextAction.isOverdue).length;
  const totalLeads = allLeads.length;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (term === "") {
      setFilteredLeads(allLeads);
    } else {
      const filtered = allLeads.filter(lead => 
        lead.customerName.toLowerCase().includes(term) || 
        lead.phoneNumber.includes(term)
      );
      setFilteredLeads(filtered);
    }
  };

  const handleFilterChange = (filteredLeads: SubprimeLead[]) => {
    setFilteredLeads(filteredLeads);
  };

  const handleLeadUpdate = (leadId: string, updates: Partial<SubprimeLead>) => {
    // Update the lead in the main leads array
    setAllLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === leadId 
          ? { ...lead, ...updates, lastActivity: new Date().toISOString() }
          : lead
      )
    );

    // Update filtered leads as well
    setFilteredLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === leadId 
          ? { ...lead, ...updates, lastActivity: new Date().toISOString() }
          : lead
      )
    );

    // Show toast notification
    toast.success(`Lead ${leadId} updated successfully`);
    
    // Here you would typically make an API call to persist the changes
    // await updateLeadInDatabase(leadId, updates);
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

    // Here you would typically make an API call to persist the new lead
    // await createLeadInDatabase(newLead);
    
    toast.success(`New lead added successfully`, {
      description: `${newLead.customerName} is now in the subprime pipeline and ready for telephony integration`
    });
  };

  const handleTileClick = (title: string, content: React.ReactNode) => {
    setActiveTileInfo({ title, content });
    setTileDialogOpen(true);
  };

  // Use allLeads for tile calculations to ensure real-time updates
  const getTileContent = () => {
    return {
      inProgress: {
        title: "In Progress Leads",
        content: (
          <div className="space-y-4">
            <p>There are currently <span className="font-bold text-yellow-600">{partialLeads}</span> leads in progress.</p>
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
            <p>There are <span className="font-bold text-red-600">{notReadyLeads}</span> leads that are not ready for funding.</p>
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
            <p><span className="font-bold text-purple-600">{needsActionLeads}</span> leads require immediate attention.</p>
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
            <p><span className="font-bold text-green-600">{readyLeads}</span> leads are ready for financing.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><span className="font-semibold">{Math.round(readyLeads * 0.4)}</span> ready for traditional financing</li>
              <li><span className="font-semibold">{Math.round(readyLeads * 0.35)}</span> qualified for special programs</li>
              <li><span className="font-semibold">{Math.round(readyLeads * 0.25)}</span> ready for alternative financing</li>
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
        <h1 className="text-2xl font-bold">Subprime Dashboard</h1>
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
            onClick={() => setAddLeadDialogOpen(true)}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add Lead
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
              <div className="text-xl font-bold">{partialLeads}</div>
              <div className="bg-yellow-100 p-1.5 rounded-full">
                <MessageSquare className="h-3.5 w-3.5 text-yellow-600" />
              </div>
            </div>
            <div className="flex items-center mt-3 text-xs">
              <span className="text-muted-foreground">{Math.round((partialLeads / totalLeads) * 100)}% of all leads</span>
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
              <div className="text-xl font-bold">{notReadyLeads}</div>
              <div className="bg-red-100 p-1.5 rounded-full">
                <Users className="h-3.5 w-3.5 text-red-600" />
              </div>
            </div>
            <div className="flex items-center mt-3 text-xs">
              <span className="text-muted-foreground">{Math.round((notReadyLeads / totalLeads) * 100)}% of all leads</span>
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
              <div className="text-xl font-bold">{needsActionLeads}</div>
              <div className="bg-purple-100 p-1.5 rounded-full">
                <Clock className="h-3.5 w-3.5 text-purple-600" />
              </div>
            </div>
            <Badge variant="outline" className="mt-3 text-xs bg-red-50 text-red-700 border-red-200">
              {needsActionLeads} overdue actions
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
              <div className="text-xl font-bold">{readyLeads}</div>
              <div className="bg-green-100 p-1.5 rounded-full">
                <Users className="h-3.5 w-3.5 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-3 text-xs">
              <span className="text-muted-foreground">{Math.round((readyLeads / totalLeads) * 100)}% of all leads</span>
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



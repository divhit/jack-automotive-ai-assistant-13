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
import { TelephonyInterfaceModern } from "@/components/subprime/TelephonyInterfaceModern";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { BarChart3, Users, MessageSquare, Clock, Info, Settings, Sliders, Phone, X, Minimize, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubprimeSettingsDialog } from "@/components/subprime/SubprimeSettingsDialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SubprimeDashboardModern = () => {
  const [allLeads, setAllLeads] = useState<SubprimeLead[]>(subprimeLeads);
  const [filteredLeads, setFilteredLeads] = useState<SubprimeLead[]>(subprimeLeads);
  const [searchTerm, setSearchTerm] = useState("");
  const [tileDialogOpen, setTileDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<SubprimeLead | null>(null);
  const [showTelephony, setShowTelephony] = useState(false);
  const [telephonyMode, setTelephonyMode] = useState<'sidebar' | 'fullscreen' | 'minimized'>('sidebar');
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
    setAllLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === leadId 
          ? { ...lead, ...updates, lastActivity: new Date().toISOString() }
          : lead
      )
    );

    setFilteredLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === leadId 
          ? { ...lead, ...updates, lastActivity: new Date().toISOString() }
          : lead
      )
    );

    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, ...updates } : null);
    }

    toast.success(`Lead updated successfully`);
  };

  const handleLeadSelect = (lead: SubprimeLead) => {
    setSelectedLead(lead);
    setShowTelephony(true);
    setTelephonyMode('sidebar');
  };

  const handleTileClick = (title: string, content: React.ReactNode) => {
    setActiveTileInfo({ title, content });
    setTileDialogOpen(true);
  };

  const closeTelephony = () => {
    setShowTelephony(false);
    setSelectedLead(null);
    setTelephonyMode('sidebar');
  };

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
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Subprime Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                {totalLeads} total leads • {needsActionLeads} need attention • {readyLeads} ready for funding
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-80">
                <Input 
                  placeholder="Search leads by name or phone..." 
                  value={searchTerm} 
                  onChange={handleSearch}
                  className="w-full"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setSettingsDialogOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Left Sidebar - Always visible */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Quick Stats */}
          <div className="p-4 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-2">
              <Card 
                className="p-3 cursor-pointer hover:bg-green-50 transition-colors"
                onClick={() => handleTileClick("Ready for Funding", getTileContent().readyForFunding.content)}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{readyLeads}</div>
                  <div className="text-xs text-gray-500">Ready</div>
                </div>
              </Card>
              <Card 
                className="p-3 cursor-pointer hover:bg-yellow-50 transition-colors"
                onClick={() => handleTileClick("In Progress", getTileContent().inProgress.content)}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{partialLeads}</div>
                  <div className="text-xs text-gray-500">In Progress</div>
                </div>
              </Card>
              <Card 
                className="p-3 cursor-pointer hover:bg-purple-50 transition-colors"
                onClick={() => handleTileClick("Needs Action", getTileContent().needsAction.content)}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{needsActionLeads}</div>
                  <div className="text-xs text-gray-500">Action Needed</div>
                </div>
              </Card>
              <Card 
                className="p-3 cursor-pointer hover:bg-red-50 transition-colors"
                onClick={() => handleTileClick("Not Ready", getTileContent().notReady.content)}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{notReadyLeads}</div>
                  <div className="text-xs text-gray-500">Not Ready</div>
                </div>
              </Card>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-gray-100">
            <SubprimeLeadFilters 
              leads={allLeads}
              onFilterChange={handleFilterChange}
            />
          </div>

          {/* Analytics Preview */}
          <div className="flex-1 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Analytics</h3>
            <SubprimeAnalytics leads={allLeads} compact />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Leads List */}
          <div className={cn(
            "bg-white transition-all duration-300",
            showTelephony && telephonyMode === 'sidebar' ? "flex-1" : "w-full"
          )}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Leads ({filteredLeads.length})
                </h2>
                {selectedLead && (
                  <Badge variant="secondary" className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    Active: {selectedLead.customerName}
                  </Badge>
                )}
              </div>
              
              <SubprimeLeadsList 
                leads={filteredLeads}
                onLeadUpdate={handleLeadUpdate}
                onLeadSelect={handleLeadSelect}
                selectedLeadId={selectedLead?.id}
              />
            </div>
          </div>

          {/* Telephony Sidebar */}
          {showTelephony && telephonyMode === 'sidebar' && (
            <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Telephony</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setTelephonyMode('fullscreen')}
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={closeTelephony}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <TelephonyInterfaceModern 
                  selectedLead={selectedLead}
                  onLeadUpdate={handleLeadUpdate}
                  className="h-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Telephony Modal */}
      {showTelephony && telephonyMode === 'fullscreen' && (
        <Dialog open={true} onOpenChange={() => setTelephonyMode('sidebar')}>
          <DialogContent className="max-w-6xl h-[90vh]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-blue-600" />
                  Telephony - {selectedLead?.customerName}
                </DialogTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setTelephonyMode('sidebar')}
                >
                  <Minimize className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <TelephonyInterfaceModern 
                selectedLead={selectedLead}
                onLeadUpdate={handleLeadUpdate}
                className="h-full"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Tile Detail Dialog */}
      <Dialog open={tileDialogOpen} onOpenChange={setTileDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              {activeTileInfo.title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {activeTileInfo.content}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <SubprimeSettingsDialog 
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />

      <Toaster />
    </div>
  );
};

export default SubprimeDashboardModern; 
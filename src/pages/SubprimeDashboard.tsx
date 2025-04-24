import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { subprimeLeads } from "@/data";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { SubprimeSettingsDialog } from "@/components/subprime/SubprimeSettingsDialog";
import { SubprimeSummaryCards } from "@/components/subprime/dashboard/SubprimeSummaryCards";
import { SubprimeDashboardHeader } from "@/components/subprime/dashboard/SubprimeDashboardHeader";
import { SubprimeMainContent } from "@/components/subprime/dashboard/SubprimeMainContent";

const SubprimeDashboard = () => {
  const [filteredLeads, setFilteredLeads] = useState<SubprimeLead[]>(subprimeLeads);
  const [searchTerm, setSearchTerm] = useState("");
  const [tileDialogOpen, setTileDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [activeTileInfo, setActiveTileInfo] = useState<{title: string; content: React.ReactNode}>({ 
    title: "", 
    content: null 
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (term === "") {
      setFilteredLeads(subprimeLeads);
    } else {
      const filtered = subprimeLeads.filter(lead => 
        lead.customerName.toLowerCase().includes(term) || 
        lead.phoneNumber.includes(term) ||
        (lead.assignedAgent && lead.assignedAgent.toLowerCase().includes(term))
      );
      setFilteredLeads(filtered);
    }
  };

  const handleTileClick = (title: string, content: React.ReactNode) => {
    setActiveTileInfo({ title, content });
    setTileDialogOpen(true);
  };

  const handleFilterChange = (filteredLeads: SubprimeLead[]) => {
    setFilteredLeads(filteredLeads);
  };

  return (
    <div className="space-y-6">
      <SubprimeDashboardHeader 
        searchTerm={searchTerm}
        onSearchChange={handleSearch}
        onSettingsClick={() => setSettingsDialogOpen(true)}
      />

      <SubprimeSummaryCards 
        leads={subprimeLeads}
        onTileClick={handleTileClick}
      />

      <SubprimeMainContent 
        leads={subprimeLeads}
        filteredLeads={filteredLeads}
        onFilterChange={handleFilterChange}
      />

      <Dialog open={tileDialogOpen} onOpenChange={setTileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeTileInfo.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {activeTileInfo.content}
          </div>
        </DialogContent>
      </Dialog>

      <SubprimeSettingsDialog 
        open={settingsDialogOpen} 
        onOpenChange={setSettingsDialogOpen} 
      />
    </div>
  );
};

export default SubprimeDashboard;

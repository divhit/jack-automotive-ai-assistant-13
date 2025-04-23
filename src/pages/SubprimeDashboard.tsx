
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { subprimeLeads } from "@/data";
import { SubprimeLeadFilters } from "@/components/subprime/SubprimeLeadFilters";
import { SubprimeAnalytics } from "@/components/subprime/SubprimeAnalytics";
import { SubprimeLeadsList } from "@/components/subprime/SubprimeLeadsList";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { BarChart3, Users, MessageSquare, Clock } from "lucide-react";

const SubprimeDashboard = () => {
  const [filteredLeads, setFilteredLeads] = useState<SubprimeLead[]>(subprimeLeads);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Analytics calculations
  const readyLeads = subprimeLeads.filter(lead => lead.fundingReadiness === "Ready").length;
  const partialLeads = subprimeLeads.filter(lead => lead.fundingReadiness === "Partial").length;
  const notReadyLeads = subprimeLeads.filter(lead => lead.fundingReadiness === "Not Ready").length;
  const needsActionLeads = subprimeLeads.filter(lead => lead.nextAction.isOverdue).length;
  const totalLeads = subprimeLeads.length;

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (term === "") {
      setFilteredLeads(subprimeLeads);
    } else {
      const filtered = subprimeLeads.filter(lead => 
        lead.customerName.toLowerCase().includes(term) || 
        lead.phoneNumber.includes(term)
      );
      setFilteredLeads(filtered);
    }
  };

  // Handle filter updates from the filter component
  const handleFilterChange = (filteredLeads: SubprimeLead[]) => {
    setFilteredLeads(filteredLeads);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Subprime Dashboard</h1>
        <div className="w-64">
          <Input 
            placeholder="Search leads..." 
            value={searchTerm} 
            onChange={handleSearch}
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Ready for Funding Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ready for Funding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{readyLeads}</div>
              <div className="bg-green-100 p-2 rounded-full">
                <Users className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <span className="text-muted-foreground">{Math.round((readyLeads / totalLeads) * 100)}% of all leads</span>
            </div>
          </CardContent>
        </Card>

        {/* In Progress Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{partialLeads}</div>
              <div className="bg-yellow-100 p-2 rounded-full">
                <MessageSquare className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <span className="text-muted-foreground">{Math.round((partialLeads / totalLeads) * 100)}% of all leads</span>
            </div>
          </CardContent>
        </Card>

        {/* Not Ready Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Not Ready</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{notReadyLeads}</div>
              <div className="bg-red-100 p-2 rounded-full">
                <Users className="h-4 w-4 text-red-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <span className="text-muted-foreground">{Math.round((notReadyLeads / totalLeads) * 100)}% of all leads</span>
            </div>
          </CardContent>
        </Card>

        {/* Needs Action Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Needs Action</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{needsActionLeads}</div>
              <div className="bg-purple-100 p-2 rounded-full">
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <Badge variant="outline" className="mt-4 bg-red-50 text-red-700 border-red-200">
              {needsActionLeads} overdue actions
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Lead List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters */}
        <div className="lg:col-span-1">
          <SubprimeLeadFilters onFilterChange={handleFilterChange} leads={subprimeLeads} />
        </div>
        
        {/* Lead List */}
        <div className="lg:col-span-3">
          <SubprimeLeadsList leads={filteredLeads} />
        </div>
      </div>

      {/* Analytics */}
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
            <SubprimeAnalytics leads={subprimeLeads} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubprimeDashboard;

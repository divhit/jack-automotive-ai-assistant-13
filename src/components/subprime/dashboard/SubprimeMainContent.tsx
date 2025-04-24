
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubprimeLeadFilters } from "@/components/subprime/SubprimeLeadFilters";
import { SubprimeLeadsList } from "@/components/subprime/SubprimeLeadsList";
import { SubprimeAnalytics } from "@/components/subprime/SubprimeAnalytics";
import { BarChart3 } from "lucide-react";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";

interface SubprimeMainContentProps {
  leads: SubprimeLead[];
  filteredLeads: SubprimeLead[];
  onFilterChange: (filteredLeads: SubprimeLead[]) => void;
}

export const SubprimeMainContent = ({ 
  leads,
  filteredLeads,
  onFilterChange
}: SubprimeMainContentProps) => {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <SubprimeLeadFilters onFilterChange={onFilterChange} leads={leads} />
        </div>
        
        <div className="lg:col-span-3">
          <SubprimeLeadsList leads={filteredLeads} />
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
            <SubprimeAnalytics leads={leads} />
          </CardContent>
        </Card>
      </div>
    </>
  );
};

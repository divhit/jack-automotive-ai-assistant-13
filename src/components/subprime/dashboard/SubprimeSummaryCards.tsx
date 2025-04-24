
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, MessageSquare, Users, Clock } from "lucide-react";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";

interface SubprimeSummaryCardsProps {
  leads: SubprimeLead[];
  onTileClick: (title: string, content: React.ReactNode) => void;
}

export const SubprimeSummaryCards = ({ leads, onTileClick }: SubprimeSummaryCardsProps) => {
  const readyLeads = leads.filter(lead => lead.fundingReadiness === "Ready").length;
  const partialLeads = leads.filter(lead => lead.fundingReadiness === "Partial").length;
  const notReadyLeads = leads.filter(lead => lead.fundingReadiness === "Not Ready").length;
  const needsActionLeads = leads.filter(lead => lead.nextAction.isOverdue).length;
  const totalLeads = leads.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="cursor-pointer hover:bg-gray-50 transition-colors" 
        onClick={() => onTileClick("In Progress Leads", 
          <div className="space-y-4">
            <p>There are currently <span className="font-bold text-yellow-600">{partialLeads}</span> leads in progress.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><span className="font-semibold">{leads.filter(l => l.scriptProgress.currentStep === "screening").length}</span> leads in Screening stage</li>
              <li><span className="font-semibold">{leads.filter(l => l.scriptProgress.currentStep === "qualification").length}</span> leads in Qualification stage</li>
              <li><span className="font-semibold">{leads.filter(l => l.nextAction.isAutomated).length}</span> leads in automated follow-up sequences</li>
            </ul>
            <p className="text-sm text-gray-600 mt-4">Most leads require income verification (64%) or credit documentation (27%).</p>
          </div>
        )}
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
        onClick={() => onTileClick("Not Ready Leads", 
          <div className="space-y-4">
            <p>There are <span className="font-bold text-red-600">{notReadyLeads}</span> leads that are not ready for funding.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><span className="font-semibold">{leads.filter(l => l.creditProfile?.knownIssues.includes("Multiple Collections")).length}</span> with major collections issues</li>
              <li><span className="font-semibold">{leads.filter(l => l.creditProfile?.knownIssues.includes("Recent Bankruptcy")).length}</span> with recent bankruptcies</li>
              <li><span className="font-semibold">{leads.filter(l => l.sentiment === "Ghosted").length}</span> leads have gone silent (no response in 72+ hours)</li>
            </ul>
            <p className="text-sm text-gray-600 mt-4">Focus areas: Credit repair education (38%), Income verification (24%), Alternative financing options (18%)</p>
          </div>
        )}
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
        onClick={() => onTileClick("Needs Action Leads", 
          <div className="space-y-4">
            <p><span className="font-bold text-purple-600">{needsActionLeads}</span> leads require immediate attention.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><span className="font-semibold">{leads.filter(l => l.nextAction.isOverdue && l.sentiment === "Frustrated").length}</span> overdue and showing frustration</li>
              <li><span className="font-semibold">{leads.filter(l => l.nextAction.isOverdue && l.chaseStatus === "Manual Review").length}</span> flagged for manual review</li>
              <li><span className="font-semibold">{leads.filter(l => l.nextAction.isOverdue && l.fundingReadiness === "Partial").length}</span> in progress leads with missed follow-ups</li>
            </ul>
            <p className="text-sm text-gray-600 mt-4">Priority contacts: Manual Review (48%), Document Collection (37%), Credit Verification (15%)</p>
          </div>
        )}
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
        onClick={() => onTileClick("Ready for Funding Leads", 
          <div className="space-y-4">
            <p><span className="font-bold text-green-600">{readyLeads}</span> leads are ready for financing.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><span className="font-semibold">{Math.round(readyLeads * 0.4)}</span> ready for traditional financing</li>
              <li><span className="font-semibold">{Math.round(readyLeads * 0.35)}</span> qualified for special programs</li>
              <li><span className="font-semibold">{Math.round(readyLeads * 0.25)}</span> ready for alternative financing</li>
            </ul>
            <p className="text-sm text-gray-600 mt-4">Average time to funding ready: 3.2 days (20% faster than last month)</p>
          </div>
        )}
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
  );
};

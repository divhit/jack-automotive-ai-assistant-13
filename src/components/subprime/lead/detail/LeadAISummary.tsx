
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";

interface LeadAISummaryProps {
  lead: SubprimeLead;
}

export const LeadAISummary = ({ lead }: LeadAISummaryProps) => {
  return (
    <Card className="p-4 bg-blue-50/50">
      <h4 className="font-medium mb-3 flex items-center gap-2">
        <span>AI Summary</span>
        <Badge variant="secondary" className="text-xs">Auto-generated</Badge>
      </h4>
      <p className="text-sm text-gray-700">
        {lead.sentiment === "Frustrated" ? 
          "URGENT: Customer shows high frustration about credit requirements - needs direct human follow-up. Has stable job (2+ years) and rental history that could qualify for alternative underwriting. Recommend immediate 1:1 call with special financing specialist." :
          lead.sentiment === "Warm" ?
          "HOT PROSPECT: Strong engagement with quick document submissions. Credit meets requirements (680+) and income verification complete. Vehicle test drive should be scheduled within 24 hours. Customer showing high purchase intent." :
          "ACTION NEEDED: Missing income verification documents. Shows consistent communication pattern but needs help with credit options. Employer verification required before moving forward. Send customized credit-building guidance."
        }
      </p>
    </Card>
  );
};

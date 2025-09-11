
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";

interface AssigneeHoverCardProps {
  specialist: string;
  leads: SubprimeLead[];
  onClick: () => void;
}

export const AssigneeHoverCard = ({ specialist, leads, onClick }: AssigneeHoverCardProps) => {
  const handleSendNudge = (lead: SubprimeLead) => {
    toast.success(`Nudge sent to ${specialist}!`, {
      description: `${lead.customerName}'s contact info has been prioritized in ${specialist}'s inbox.`,
    });
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button 
          onClick={onClick}
          className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full hover:bg-gray-200 transition-colors"
        >
          {specialist}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="start">
        <div className="space-y-2">
          <h3 className="font-semibold">{specialist}'s Leads</h3>
          <div className="space-y-2">
            {leads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="space-y-1">
                  <div className="font-medium text-sm">{lead.customerName}</div>
                  <div className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(lead.lastTouchpoint), { addSuffix: true })}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSendNudge(lead);
                  }}
                >
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

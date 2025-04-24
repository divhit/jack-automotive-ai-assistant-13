
import { Button } from "@/components/ui/button";
import { MessageSquare, Phone, FileText, Check } from "lucide-react";

interface LeadActionsProps {
  onAddNote: () => void;
}

export const LeadActions = ({ onAddNote }: LeadActionsProps) => {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button size="sm" variant="outline" className="flex items-center gap-1">
        <MessageSquare className="h-4 w-4" />
        <span>Send SMS</span>
      </Button>
      <Button size="sm" variant="outline" className="flex items-center gap-1">
        <Phone className="h-4 w-4" />
        <span>Call Lead</span>
      </Button>
      <Button size="sm" variant="outline" className="flex items-center gap-1">
        <FileText className="h-4 w-4" />
        <span>Request Docs</span>
      </Button>
      <Button size="sm" variant="default" className="flex items-center gap-1 ml-auto">
        <Check className="h-4 w-4" />
        <span>Mark Ready</span>
      </Button>
    </div>
  );
};

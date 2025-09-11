
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";

interface LeadHeaderProps {
  lead: SubprimeLead;
  autoChase: boolean;
  onAutoChaseChange: (checked: boolean) => void;
}

export const LeadHeader = ({ lead, autoChase, onAutoChaseChange }: LeadHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-bold text-lg">{lead.customerName}</h3>
        <p className="text-sm text-gray-600">{lead.phoneNumber}</p>
        {lead.email && <p className="text-sm text-gray-600">{lead.email}</p>}
      </div>
      <div className="flex items-center space-x-2">
        <Label htmlFor="auto-chase" className={autoChase ? "text-green-600" : "text-gray-500"}>
          {autoChase ? "Auto Chase Active" : "Auto Chase Paused"}
        </Label>
        <Switch 
          id="auto-chase" 
          checked={autoChase} 
          onCheckedChange={onAutoChaseChange} 
        />
      </div>
    </div>
  );
};

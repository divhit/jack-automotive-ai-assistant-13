
import { Card } from "@/components/ui/card";
import { AlertTriangle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";

interface LeadProgressCardProps {
  lead: SubprimeLead;
}

export const LeadProgressCard = ({ lead }: LeadProgressCardProps) => {
  const progressSteps = ["contacted", "screening", "qualification", "routing", "submitted"];
  const currentStepIndex = progressSteps.indexOf(lead.scriptProgress.currentStep);
  
  const getProgressPercentage = () => {
    return ((currentStepIndex + 1) / progressSteps.length) * 100;
  };

  return (
    <Card className="p-4">
      <h4 className="font-medium mb-2">Funding Journey Progress</h4>
      
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
        <div 
          className="bg-automotive-primary h-2.5 rounded-full" 
          style={{ width: `${getProgressPercentage()}%` }}
        ></div>
      </div>
      
      <div className="grid grid-cols-5 text-xs">
        {progressSteps.map((step, index) => (
          <div key={step} className="flex flex-col items-center">
            <span className={`${currentStepIndex >= index ? "text-automotive-primary font-medium" : "text-gray-500"}`}>
              {step.charAt(0).toUpperCase() + step.slice(1)}
            </span>
          </div>
        ))}
      </div>
      
      <div className="mt-4">
        <h5 className="text-sm font-medium">Next Action:</h5>
        <div className="mt-1 flex items-center">
          {lead.nextAction.isOverdue ? 
            <AlertTriangle className="h-4 w-4 text-red-500 mr-1" /> : 
            <Calendar className="h-4 w-4 text-gray-600 mr-1" />
          }
          <span className={`text-sm ${lead.nextAction.isOverdue ? "text-red-500" : "text-gray-700"}`}>
            {lead.nextAction.type} • {format(new Date(lead.nextAction.dueDate), "MMM d, h:mm a")}
          </span>
        </div>
      </div>
    </Card>
  );
};

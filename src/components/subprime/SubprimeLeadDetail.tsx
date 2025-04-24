
import { useState } from "react";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { subprimeLeads } from "@/data";
import { Check, Phone, MessageSquare, FileText, Calendar, AlertTriangle } from "lucide-react";
import { AssigneeDetailsDialog } from "./lead/AssigneeDetailsDialog";
import { LeadAISummary } from "./lead/LeadAISummary";
import { LeadHeader } from "./lead/LeadHeader";
import { LeadDetailsCard } from "./lead/LeadDetailsCard";
import { LeadConversation } from "./lead/LeadConversation";

interface SubprimeLeadDetailProps {
  lead: SubprimeLead;
}

export const SubprimeLeadDetail = ({ lead }: SubprimeLeadDetailProps) => {
  const [autoChase, setAutoChase] = useState(lead.chaseStatus === "Auto Chase Running");
  const [internalNote, setInternalNote] = useState("");
  const [isAssigneeDialogOpen, setIsAssigneeDialogOpen] = useState(false);
  
  const progressSteps = ["contacted", "screening", "qualification", "routing", "submitted"];
  const currentStepIndex = progressSteps.indexOf(lead.scriptProgress.currentStep);
  
  const getProgressPercentage = () => {
    return ((currentStepIndex + 1) / progressSteps.length) * 100;
  };

  const handleToggleAutoChase = () => {
    setAutoChase(!autoChase);
  };

  const handleAddNote = () => {
    if (internalNote.trim()) {
      setInternalNote("");
    }
  };

  const getLeadsForSpecialist = (specialist: string) => {
    return subprimeLeads.filter(l => l.assignedSpecialist === specialist);
  };

  return (
    <div className="space-y-6">
      <LeadAISummary lead={lead} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <LeadHeader 
            lead={lead}
            autoChase={autoChase}
            onAutoChaseChange={handleToggleAutoChase}
          />
          
          <LeadDetailsCard 
            lead={lead}
            onAssigneeClick={() => setIsAssigneeDialogOpen(true)}
          />
          
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
                  {lead.nextAction.type}
                </span>
              </div>
            </div>
          </Card>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium">Conversation History</h4>
            <LeadConversation messages={lead.conversations} />
          </div>
          
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
          
          <div className="mt-4">
            <h5 className="text-sm font-medium mb-1">Add Internal Note</h5>
            <Textarea 
              placeholder="Add private note about this lead..." 
              className="min-h-24" 
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
            />
            <div className="flex justify-end mt-2">
              <Button 
                size="sm"
                onClick={handleAddNote}
                disabled={!internalNote.trim()}
              >
                Add Note
              </Button>
            </div>
          </div>
        </div>
      </div>

      {lead.assignedAgent && (
        <AssigneeDetailsDialog
          specialist={lead.assignedAgent}
          leads={getLeadsForSpecialist(lead.assignedAgent)}
          open={isAssigneeDialogOpen}
          onOpenChange={setIsAssigneeDialogOpen}
        />
      )}
    </div>
  );
};

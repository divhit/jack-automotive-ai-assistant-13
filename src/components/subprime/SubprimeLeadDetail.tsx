import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useState } from "react";
import { Check, Phone, MessageSquare, FileText, Calendar, AlertTriangle } from "lucide-react";

interface SubprimeLeadDetailProps {
  lead: SubprimeLead;
}

export const SubprimeLeadDetail = ({ lead }: SubprimeLeadDetailProps) => {
  const [autoChase, setAutoChase] = useState(lead.chaseStatus === "Auto Chase Running");
  const [internalNote, setInternalNote] = useState("");
  
  const progressSteps = ["contacted", "screening", "qualification", "routing", "submitted"];
  const currentStepIndex = progressSteps.indexOf(lead.scriptProgress.currentStep);
  
  const getProgressPercentage = () => {
    return ((currentStepIndex + 1) / progressSteps.length) * 100;
  };

  const formatMessageTime = (timestamp: string) => {
    return format(new Date(timestamp), "MMM d, h:mm a");
  };

  const handleToggleAutoChase = () => {
    setAutoChase(!autoChase);
  };

  const handleAddNote = () => {
    if (internalNote.trim()) {
      setInternalNote("");
    }
  };

  const getMessageBackground = (type: string, sentBy?: string) => {
    if (type === "system") return "bg-gray-100";
    if (type === "note") return "bg-blue-50";
    
    if (sentBy === "lead") return "bg-gray-100";
    return "bg-automotive-primary text-white";
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-blue-50/50">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <span>AI Summary</span>
          <Badge variant="secondary" className="text-xs">Auto-generated</Badge>
        </h4>
        <p className="text-sm text-gray-700">
          {lead.sentiment === "Frustrated" ? 
            "Customer shows signs of frustration with the approval process. Recommend human intervention and empathetic approach." :
            lead.sentiment === "Warm" ?
            "Lead is engaging positively and moving through the qualification process well. Next steps focused on document collection." :
            "Regular follow-up maintaining current engagement level. Following standard qualification process."
          }
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
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
                onCheckedChange={handleToggleAutoChase} 
              />
            </div>
          </div>
          
          <Card className="p-4">
            <h4 className="font-medium mb-2">Lead Details</h4>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Funding Readiness:</span>
                <Badge className={
                  lead.fundingReadiness === "Ready" ? "bg-green-100 text-green-800" :
                  lead.fundingReadiness === "Partial" ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                }>
                  {lead.fundingReadiness}
                </Badge>
              </div>
              
              <div className="text-xs text-gray-500 italic">
                {lead.fundingReadinessReason}
              </div>
              
              {lead.creditProfile && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Credit Score:</span>
                    <span className="font-medium">{lead.creditProfile.scoreRange}</span>
                  </div>
                  
                  {lead.creditProfile.knownIssues && lead.creditProfile.knownIssues.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-sm text-gray-600">Known Issues:</span>
                      <div className="flex flex-wrap gap-1">
                        {lead.creditProfile.knownIssues.map((issue, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {issue}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {lead.vehiclePreference && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Vehicle Preference:</span>
                  <span className="font-medium">{lead.vehiclePreference}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Assigned:</span>
                <span className="font-medium">{lead.assignedAgent || "Unassigned"}</span>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <h4 className="font-medium mb-2">Funding Journey Progress</h4>
            
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div 
                className="bg-automotive-primary h-2.5 rounded-full" 
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
            
            <div className="grid grid-cols-5 gap-1 text-xs">
              <div className={`text-center ${currentStepIndex >= 0 ? "text-automotive-primary font-medium" : "text-gray-500"}`}>
                Contacted
              </div>
              <div className={`text-center ${currentStepIndex >= 1 ? "text-automotive-primary font-medium" : "text-gray-500"}`}>
                Screening
              </div>
              <div className={`text-center ${currentStepIndex >= 2 ? "text-automotive-primary font-medium" : "text-gray-500"}`}>
                Qualification
              </div>
              <div className={`text-center ${currentStepIndex >= 3 ? "text-automotive-primary font-medium" : "text-gray-500"}`}>
                Routing
              </div>
              <div className={`text-center ${currentStepIndex >= 4 ? "text-automotive-primary font-medium" : "text-gray-500"}`}>
                Submitted
              </div>
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
        </div>
        
        <div className="lg:col-span-2 space-y-4">
          <h4 className="font-medium">Conversation History</h4>
          
          <div className="bg-white rounded-lg border h-96 overflow-y-auto p-4 space-y-4">
            {lead.conversations.map((message, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg ${getMessageBackground(message.type, message.sentBy)}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium">
                    {message.type === "system" ? "System Event" : 
                     message.type === "note" ? "Internal Note" :
                     message.sentBy === "lead" ? lead.customerName : 
                     message.sentBy === "agent" ? lead.assignedAgent : "Jack AI"}
                  </span>
                  <span className="text-xs opacity-75">
                    {formatMessageTime(message.timestamp)}
                  </span>
                </div>
                <p className="text-sm">{message.content}</p>
              </div>
            ))}
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
    </div>
  );
};

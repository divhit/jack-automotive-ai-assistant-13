
import { useState } from "react";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { subprimeLeads } from "@/data";
import { Check, Phone, MessageSquare, FileText, Calendar, AlertTriangle, UserRound } from "lucide-react";
import { AssigneeDetailsDialog } from "./lead/AssigneeDetailsDialog";

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

  const getLeadsForSpecialist = (specialist: string) => {
    return subprimeLeads.filter(l => l.assignedSpecialist === specialist);
  };

  return (
    <div className="space-y-6">
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
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">Lead Details</h4>
              {lead.assignedAgent && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsAssigneeDialogOpen(true)}
                  className="inline-flex items-center gap-2 text-xs bg-gray-50 hover:bg-gray-100"
                >
                  <UserRound className="h-3.5 w-3.5" />
                  <span>Assigned to: {lead.assignedAgent}</span>
                </Button>
              )}
            </div>
            
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
            
            <div className="grid grid-cols-5 text-xs">
              <div className="flex flex-col items-center">
                <span className={`${currentStepIndex >= 0 ? "text-automotive-primary font-medium" : "text-gray-500"}`}>
                  Contacted
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className={`${currentStepIndex >= 1 ? "text-automotive-primary font-medium" : "text-gray-500"}`}>
                  Screening
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className={`${currentStepIndex >= 2 ? "text-automotive-primary font-medium" : "text-gray-500"}`}>
                  Qualification
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className={`${currentStepIndex >= 3 ? "text-automotive-primary font-medium" : "text-gray-500"}`}>
                  Routing
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className={`${currentStepIndex >= 4 ? "text-automotive-primary font-medium" : "text-gray-500"}`}>
                  Submitted
                </span>
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
        
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium">Conversation History</h4>
            
            <div className="bg-white rounded-lg border h-[calc(100vh-380px)] overflow-y-auto p-4 space-y-4">
              <div className="p-3 rounded-lg bg-automotive-primary text-white">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium">Jack AI</span>
                  <span className="text-xs opacity-75">Apr 23, 10:15 AM</span>
                </div>
                <p className="text-sm">Hi John! I'm Jack, an AI assistant from Automarket specialized in helping customers like you secure auto financing, even with less-than-perfect credit. I've helped many customers with similar situations get approved quickly. Quick answers via text are perfectly fine - they don't need to be perfect! You can also request a phone call anytime to complete your application over the phone, whatever works best for you. To get started, could you share your preferred monthly payment range? This will help me find the best options for your budget.</p>
              </div>

              <div className="p-3 rounded-lg bg-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium">{lead.customerName}</span>
                  <span className="text-xs opacity-75">Apr 23, 10:15 AM</span>
                </div>
                <p className="text-sm">Looking to stay under $400/month if possible. My credit isn't great but I have steady income.</p>
              </div>

              <div className="p-3 rounded-lg bg-automotive-primary text-white">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium">Jack AI</span>
                  <span className="text-xs opacity-75">Apr 23, 10:20 AM</span>
                </div>
                <p className="text-sm">Thanks for being upfront about your situation! Don't worry - we have special financing programs designed for various credit situations, and your steady income is a big plus. To help find the best program for you, I just need a few quick details. First, could you confirm if you're currently employed full-time? Also, feel free to call or text me at any time if you prefer talking directly.</p>
              </div>

              <div className="p-3 rounded-lg bg-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium">{lead.customerName}</span>
                  <span className="text-xs opacity-75">Apr 23, 10:25 AM</span>
                </div>
                <p className="text-sm">Yes, been at my job for 2 years. Make about $3200/month.</p>
              </div>

              <div className="p-3 rounded-lg bg-automotive-primary text-white">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium">Jack AI</span>
                  <span className="text-xs opacity-75">Apr 23, 10:30 AM</span>
                </div>
                <p className="text-sm">That's great! With your income, we have several SUV options that could work. I can help you get pre-qualified - would you be able to provide your last two pay stubs?</p>
              </div>

              <div className="p-3 rounded-lg bg-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium">{lead.customerName}</span>
                  <span className="text-xs opacity-75">Apr 23, 11:45 AM</span>
                </div>
                <p className="text-sm">I can get those to you tonight. What kind of interest rate could I expect with my credit situation?</p>
              </div>

              <div className="p-3 rounded-lg bg-automotive-primary text-white">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium">Jack AI</span>
                  <span className="text-xs opacity-75">Apr 23, 11:50 AM</span>
                </div>
                <p className="text-sm">Great! Rates vary based on several factors, but with your steady employment history, we can work to find competitive options. Once we have your documents, our finance team can provide specific rate estimates for different vehicles.</p>
              </div>

              <div className="p-3 rounded-lg bg-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium">{lead.customerName}</span>
                  <span className="text-xs opacity-75">Apr 23, 4:30 PM</span>
                </div>
                <p className="text-sm">Just sent over my pay stubs. Do you have anything like a Honda CR-V or Toyota RAV4 in my price range?</p>
              </div>

              <div className="p-3 rounded-lg bg-automotive-primary text-white">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium">Jack AI</span>
                  <span className="text-xs opacity-75">Apr 23, 4:35 PM</span>
                </div>
                <p className="text-sm">Thanks for sending those! I received your documents and they look good. We do have several CR-Vs and RAV4s that could work with your budget. Would you prefer a newer model with higher mileage or slightly older with lower mileage?</p>
              </div>

              <div className="p-3 rounded-lg bg-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium">{lead.customerName}</span>
                  <span className="text-xs opacity-75">Apr 23, 4:40 PM</span>
                </div>
                <p className="text-sm">I'd prefer newer with higher mileage. Also, what other documents do you need from me?</p>
              </div>

              <div className="p-3 rounded-lg bg-automotive-primary text-white">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium">Jack AI</span>
                  <span className="text-xs opacity-75">Apr 23, 4:42 PM</span>
                </div>
                <p className="text-sm">Great choice! For the next step, we'll need a copy of your ID to verify your identity. I've created a secure upload link for you: <span className="underline cursor-pointer">https://secure.automarket.com/upload/39fk2</span>. The link is valid for 24 hours and uses bank-level encryption. Simply click the link, upload a photo of your ID (both sides), and you're all set. Once that's done, I can show you some specific CR-V options that match your criteria.</p>
              </div>

            </div>
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

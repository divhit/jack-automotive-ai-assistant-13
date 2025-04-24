import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { SubprimeLead } from '@/data/subprime/subprimeLeads';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { LeadStatusBadge } from './lead/LeadStatusBadge';
import { Button } from '@/components/ui/button';
import { Check, Copy, Phone, MessageSquare, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface SubprimeLeadDetailProps {
  lead: SubprimeLead;
}

export const SubprimeLeadDetail = ({ lead }: SubprimeLeadDetailProps) => {
  // Add logic to copy phone number
  const handleCopyPhone = () => {
    navigator.clipboard.writeText(lead.phoneNumber);
    toast.success("Phone number copied to clipboard");
  };
  
  // Add logic to send a nudge to the assigned agent
  const sendNudgeToAssignee = () => {
    if (lead.assignedAgent) {
      toast.success(`Notification sent to ${lead.assignedAgent} about ${lead.customerName}'s lead`, {
        description: "They'll receive contact details and current status information."
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{lead.customerName}</h2>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">{lead.phoneNumber}</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopyPhone}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            {lead.email && (
              <span className="text-gray-500">{lead.email}</span>
            )}
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <div className="text-right">
            <div className="text-sm text-gray-500">Assigned to:</div>
            <div className="font-medium">
              {lead.assignedAgent || "Unassigned"}
            </div>
          </div>
          
          {lead.assignedAgent && (
            <Button 
              variant="outline" 
              size="sm"
              className="flex gap-2"
              onClick={sendNudgeToAssignee}
            >
              <Bell className="h-4 w-4" />
              Notify {lead.assignedAgent}
            </Button>
          )}
          
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Lead Details</TabsTrigger>
          <TabsTrigger value="progress">Script Progress</TabsTrigger>
          <TabsTrigger value="credit">Credit Profile</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Status</div>
                <LeadStatusBadge lead={lead} />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Funding Readiness</div>
                <div className="font-medium">{lead.fundingReadiness}</div>
                <div className="text-sm text-gray-500">{lead.fundingReadinessReason}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Last Touchpoint</div>
                <div className="font-medium">{formatDistanceToNow(new Date(lead.lastTouchpoint), { addSuffix: true })}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Next Action</div>
                <div className="font-medium">{lead.nextAction.type}</div>
                <div className="text-sm text-gray-500">Due {formatDistanceToNow(new Date(lead.nextAction.dueDate), { addSuffix: true })}</div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="progress">
          <Card className="p-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-500">Current Step</div>
              <div className="font-medium">{lead.scriptProgress.currentStep}</div>
              <Progress value={lead.scriptProgress.completedSteps.length / 5 * 100} />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Contacted</span>
                <span>Screening</span>
                <span>Qualification</span>
                <span>Routing</span>
                <span>Submitted</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="credit">
          <Card className="p-4">
            {lead.creditProfile ? (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Credit Score Range</div>
                <div className="font-medium">{lead.creditProfile.scoreRange}</div>
                {lead.creditProfile.knownIssues.length > 0 && (
                  <>
                    <div className="text-sm font-medium text-gray-500 mt-3">Known Issues</div>
                    <ul className="list-disc pl-5">
                      {lead.creditProfile.knownIssues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ) : (
              <div className="text-gray-500">No credit profile available</div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="conversations">
          <Card className="p-4">
            {lead.conversations.length > 0 ? (
              <div className="space-y-3">
                {lead.conversations.map((conversation, i) => (
                  <div key={i} className="border rounded-md p-3">
                    <div className="text-sm text-gray-500">{conversation.type} - {formatDistanceToNow(new Date(conversation.timestamp), { addSuffix: true })}</div>
                    <div className="font-medium">{conversation.content}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">No conversations available</div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

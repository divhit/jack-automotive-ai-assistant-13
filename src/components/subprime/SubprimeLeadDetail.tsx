
import React from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { SubprimeLead } from '@/data/subprime/subprimeLeads';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { LeadStatusBadge } from './lead/LeadStatusBadge';
import { Button } from '@/components/ui/button';
import { Check, Copy, Phone, MessageSquare, Bell, CalendarClock, Send } from 'lucide-react';
import { toast } from 'sonner';

interface SubprimeLeadDetailProps {
  lead: SubprimeLead;
}

export const SubprimeLeadDetail = ({ lead }: SubprimeLeadDetailProps) => {
  const handleCopyPhone = () => {
    navigator.clipboard.writeText(lead.phoneNumber);
    toast.success("Phone number copied to clipboard");
  };
  
  const sendNudgeToAssignee = () => {
    if (lead.assignedAgent) {
      toast.success(`Notification sent to ${lead.assignedAgent} about ${lead.customerName}'s lead`, {
        description: "They'll receive contact details and current status information."
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Summary at the top */}
      <Card className="bg-gray-50 p-4">
        <h3 className="flex items-center gap-2 font-medium text-gray-700">
          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">Auto-generated</span>
          AI Summary
        </h3>
        <p className="mt-2 text-gray-700">
          {lead.fundingReadinessReason || 'HOT PROSPECT: Strong engagement with quick document submissions. Credit meets requirements and income verification complete. Vehicle test drive should be scheduled within 24 hours. Customer showing high purchase intent.'}
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Customer info and lead details */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div>
            <h2 className="text-2xl font-bold">{lead.customerName}</h2>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">{lead.phoneNumber}</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopyPhone}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {lead.email && (
              <div className="text-gray-500 mt-1">{lead.email}</div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <div className="text-green-600 font-medium">
                {lead.status === 'Auto Chase' ? 'Auto Chase' : lead.status}
              </div>
              <div className="text-green-600 font-medium">
                Active
              </div>
            </div>
          </div>

          {/* Lead Details Card */}
          <Card className="p-4">
            <h3 className="text-lg font-bold mb-4">Lead Details</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-gray-500">Funding Readiness:</div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">Ready</Badge>
                </div>
                <div className="text-sm text-gray-500 mt-1">All documents submitted and verified</div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500">Credit Score:</div>
                <div className="font-medium">{lead.creditProfile?.scoreRange || '680-720'}</div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500">Vehicle Preference:</div>
                <div className="font-medium">SUV</div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500">Assigned:</div>
                <div className="font-medium">{lead.assignedAgent || 'Unassigned'}</div>
              </div>
            </div>
          </Card>
          
          {/* Funding Journey Progress */}
          <Card className="p-4">
            <h3 className="text-lg font-bold mb-4">Funding Journey Progress</h3>
            
            <Progress value={lead.scriptProgress.completedSteps.length / 5 * 100} className="h-4 mb-2" />
            
            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
              <span>Contact</span>
              <span>Screening</span>
              <span>Qualification</span>
              <span>Routing</span>
              <span>Submitted</span>
            </div>
            
            <div className="mt-6">
              <div className="text-sm font-medium text-gray-700">Next Action:</div>
              <div className="flex items-start gap-2 mt-2">
                <CalendarClock className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="font-medium">Schedule test drive</div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(lead.nextAction.dueDate), 'MMM d, h:mm a')}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column - Conversation History */}
        <div className="md:col-span-2">
          <h3 className="text-lg font-bold mb-4">Conversation History</h3>
          
          <div className="space-y-4">
            {lead.conversations.map((conversation, i) => (
              <div key={i} className={`p-4 rounded-lg ${conversation.type === 'outgoing' ? 'bg-blue-800 text-white' : 'bg-gray-100'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">
                    {conversation.type === 'outgoing' ? 'Jack AI' : lead.customerName}
                  </span>
                  <span className="text-sm text-opacity-80">
                    {format(new Date(conversation.timestamp), 'MMM d, h:mm a')}
                  </span>
                </div>
                <p className={`${conversation.type === 'outgoing' ? 'text-white' : 'text-gray-800'}`}>
                  {conversation.content}
                </p>
              </div>
            ))}
            
            {/* Action buttons at the bottom */}
            <div className="flex gap-3 mt-6 justify-between">
              <Button variant="outline" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Send SMS
              </Button>
              
              <Button variant="outline" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Call Lead
              </Button>
              
              <Button variant="outline" className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Request Docs
              </Button>
              
              <Button variant="default" className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Mark Ready
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

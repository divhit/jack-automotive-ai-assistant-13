
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Phone, FileText, Check, PhoneCall } from "lucide-react";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { toast } from "sonner";
import TwilioService from "@/services/twilioService";

interface LeadActionsProps {
  lead: SubprimeLead;
  onAddNote: () => void;
  onLeadUpdate?: (leadId: string, updates: Partial<SubprimeLead>) => void;
}

export const LeadActions = ({ lead, onAddNote, onLeadUpdate }: LeadActionsProps) => {
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const [activeCallSid, setActiveCallSid] = useState<string | null>(null);
  const twilioService = new TwilioService();

  const handleInitiateCall = async () => {
    try {
      setIsCallInProgress(true);
      toast.info("Initiating call...");

      // Convert lead to context format
      const leadContext = twilioService.convertLeadToContext(lead);

      // Initiate the call
      const callResponse = await twilioService.initiateOutboundCall({
        to: lead.phoneNumber,
        leadData: leadContext,
        agentId: 'ai_agent'
      });

      setActiveCallSid(callResponse.callSid);
      
      // Update lead status to indicate call in progress
      onLeadUpdate?.(lead.id, {
        chaseStatus: 'Auto Chase Running',
        conversations: [
          ...(lead.conversations || []),
          {
            type: 'call',
            content: `Outbound AI call initiated to ${lead.phoneNumber}`,
            timestamp: new Date().toISOString(),
            sentBy: 'system'
          }
        ]
      });

      toast.success(`Call initiated to ${lead.customerName}`, {
        description: `Call SID: ${callResponse.callSid}`
      });

      // Poll for call status updates
      pollCallStatus(callResponse.callSid);

    } catch (error) {
      console.error('Failed to initiate call:', error);
      toast.error("Failed to initiate call", {
        description: (error as Error).message
      });
      setIsCallInProgress(false);
    }
  };

  const handleEndCall = async () => {
    if (!activeCallSid) return;

    try {
      await twilioService.endCall(activeCallSid);
      setIsCallInProgress(false);
      setActiveCallSid(null);
      
      toast.success("Call ended");
      
      // Update lead status
      onLeadUpdate?.(lead.id, {
        conversations: [
          ...(lead.conversations || []),
          {
            type: 'call',
            content: `Call ended`,
            timestamp: new Date().toISOString(),
            sentBy: 'system'
          }
        ]
      });
    } catch (error) {
      console.error('Failed to end call:', error);
      toast.error("Failed to end call");
    }
  };

  const pollCallStatus = async (callSid: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await twilioService.getCallStatus(callSid);
        
        if (status.status === 'completed' || status.status === 'canceled' || status.status === 'failed') {
          clearInterval(pollInterval);
          setIsCallInProgress(false);
          setActiveCallSid(null);
          
          // Update lead with call completion
          onLeadUpdate?.(lead.id, {
            conversations: [
              ...(lead.conversations || []),
              {
                type: 'call',
                content: `Call ${status.status} - Duration: ${status.duration || 0}s`,
                timestamp: new Date().toISOString(),
                sentBy: 'system'
              }
            ]
          });
          
          toast.info(`Call ${status.status}`, {
            description: status.duration ? `Duration: ${status.duration} seconds` : undefined
          });
        }
      } catch (error) {
        console.error('Error polling call status:', error);
        clearInterval(pollInterval);
      }
    }, 3000); // Poll every 3 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 300000);
  };

  const handleSendSMS = () => {
    toast.info("SMS functionality coming soon");
  };

  const handleRequestDocs = () => {
    toast.info("Document request functionality coming soon");
  };

  const handleMarkReady = () => {
    onLeadUpdate?.(lead.id, {
      fundingReadiness: 'Ready'
    });
    toast.success("Lead marked as ready for funding");
  };

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button size="sm" variant="outline" className="flex items-center gap-1" onClick={handleSendSMS}>
        <MessageSquare className="h-4 w-4" />
        <span>Send SMS</span>
      </Button>
      
      {!isCallInProgress ? (
        <Button 
          size="sm" 
          variant="outline" 
          className="flex items-center gap-1"
          onClick={handleInitiateCall}
        >
          <Phone className="h-4 w-4" />
          <span>Call Lead</span>
        </Button>
      ) : (
        <Button 
          size="sm" 
          variant="destructive" 
          className="flex items-center gap-1"
          onClick={handleEndCall}
        >
          <PhoneCall className="h-4 w-4" />
          <span>End Call</span>
        </Button>
      )}
      
      <Button size="sm" variant="outline" className="flex items-center gap-1" onClick={handleRequestDocs}>
        <FileText className="h-4 w-4" />
        <span>Request Docs</span>
      </Button>
      
      <Button size="sm" variant="default" className="flex items-center gap-1 ml-auto" onClick={handleMarkReady}>
        <Check className="h-4 w-4" />
        <span>Mark Ready</span>
      </Button>
    </div>
  );
};

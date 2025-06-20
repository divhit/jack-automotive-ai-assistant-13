import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, FileText, MessageSquare, Phone } from "lucide-react";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { format } from "date-fns";

interface LeadConversationProps {
  lead: SubprimeLead;
  internalNote: string;
  onInternalNoteChange: (note: string) => void;
  onAddNote: () => void;
  onLeadUpdate?: (leadId: string, updates: Partial<SubprimeLead>) => void;
}

export const LeadConversation = ({ 
  lead,
  internalNote,
  onInternalNoteChange,
  onAddNote,
  onLeadUpdate
}: LeadConversationProps) => {
  return (
    <div className="space-y-4">
      <h4 className="font-medium">Conversation History</h4>
      
      <div className="bg-white rounded-lg border h-[calc(100vh-380px)] overflow-y-auto p-4 space-y-4">
        <div className="p-3 rounded-lg bg-automotive-primary text-white">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium">Jack AI</span>
            <span className="text-xs opacity-75">Apr 23, 10:15 AM</span>
          </div>
          <p className="text-sm">Hi {lead.customerName.split(' ')[0]}! I'm Jack, an AI assistant from Automarket specialized in helping customers like you secure auto financing, even with less-than-perfect credit. I've helped many customers with similar situations get approved quickly. Quick answers via text are perfectly fine - they don't need to be perfect! You can also request a phone call anytime to complete your application over the phone, whatever works best for you. To get started, could you share your preferred monthly payment range? This will help me find the best options for your budget.</p>
        </div>

        {/* Sample conversation messages - These would typically come from the lead's conversation history */}
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
      
      <div className="mt-4">
        <h5 className="text-sm font-medium mb-1">Add Internal Note</h5>
        <Textarea 
          placeholder="Add private note about this lead..." 
          className="min-h-24" 
          value={internalNote}
          onChange={(e) => onInternalNoteChange(e.target.value)}
        />
        <div className="flex justify-end mt-2">
          <Button 
            size="sm"
            onClick={onAddNote}
            disabled={!internalNote.trim()}
          >
            Add Note
          </Button>
        </div>
      </div>
    </div>
  );
};

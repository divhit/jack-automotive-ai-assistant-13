
import { format } from "date-fns";

interface LeadConversationProps {
  messages: Array<{
    type: string;
    content: string;
    sentBy?: string;
    timestamp: string;
  }>;
}

export const LeadConversation = ({ messages }: LeadConversationProps) => {
  const getMessageBackground = (type: string, sentBy?: string) => {
    if (type === "system") return "bg-gray-100";
    if (type === "note") return "bg-blue-50";
    if (sentBy === "lead") return "bg-gray-100";
    return "bg-automotive-primary text-white";
  };

  return (
    <div className="bg-white rounded-lg border h-[calc(100vh-380px)] overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => (
        <div 
          key={index} 
          className={`p-3 rounded-lg ${getMessageBackground(message.type, message.sentBy)}`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium">{message.sentBy || "System"}</span>
            <span className="text-xs opacity-75">
              {format(new Date(message.timestamp), "MMM d, h:mm a")}
            </span>
          </div>
          <p className="text-sm">{message.content}</p>
        </div>
      ))}
    </div>
  );
};

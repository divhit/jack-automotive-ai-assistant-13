
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mic } from "lucide-react";

interface ChatMessage {
  type: "user" | "ai";
  content: string;
  timestamp: Date;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  isVoiceMode?: boolean;
}

export const ChatMessages = ({ messages, isTyping, messagesEndRef, isVoiceMode }: ChatMessagesProps) => {
  return (
    <ScrollArea className="h-[calc(100%-7.5rem)] p-4 pb-0">
      <div className="flex flex-col space-y-4">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`flex ${message.type === "user" ? "flex-row-reverse" : "flex-row"} items-start gap-2 max-w-[80%]`}>
              <Avatar className={`${message.type === "user" ? "bg-automotive-accent text-white" : "bg-automotive-primary text-white"}`}>
                <AvatarFallback>
                  {message.type === "user" ? "U" : "J"}
                </AvatarFallback>
              </Avatar>
              <div 
                className={`p-3 rounded-lg ${
                  message.type === "user" 
                    ? "bg-automotive-accent text-white" 
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <div className="whitespace-pre-line">{message.content}</div>
                <div className="text-xs mt-1 opacity-70">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex flex-row items-start gap-2 max-w-[80%]">
              <Avatar className="bg-automotive-primary text-white">
                <AvatarFallback>J</AvatarFallback>
              </Avatar>
              <div className="p-3 rounded-lg bg-gray-100 text-gray-800">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isVoiceMode && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-2 bg-automotive-primary text-white px-4 py-2 rounded-full">
              <Mic className="h-4 w-4 animate-pulse" />
              <span className="text-sm">Voice mode active - speak or use the ElevenLabs widget below</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};

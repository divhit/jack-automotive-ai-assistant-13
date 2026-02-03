
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
      <div className="flex flex-col space-y-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`flex ${message.type === "user" ? "flex-row-reverse" : "flex-row"} items-end gap-2 max-w-[75%]`}>
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarFallback className={`text-[11px] font-medium ${
                  message.type === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {message.type === "user" ? "U" : "J"}
                </AvatarFallback>
              </Avatar>
              <div
                className={`px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed ${
                  message.type === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                <div className="whitespace-pre-line">{message.content}</div>
                <div className={`text-[11px] mt-1 ${
                  message.type === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex flex-row items-end gap-2 max-w-[75%]">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-muted text-muted-foreground text-[11px] font-medium">J</AvatarFallback>
              </Avatar>
              <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-muted">
                <div className="flex space-x-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isVoiceMode && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm shadow-sm">
              <Mic className="h-3.5 w-3.5 animate-pulse-subtle" />
              <span>Voice mode active</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};

import React from "react";
import { format } from "date-fns";
import { Mic, ArrowDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConversationMessage {
  id: string;
  type: "sms" | "call" | "system" | "voice";
  content: string;
  timestamp: string;
  sentBy: "user" | "agent" | "system" | "human_agent";
  status?: "sent" | "delivered" | "failed";
}

interface DarkConversationThreadProps {
  conversationHistory: ConversationMessage[];
  liveTranscripts: Map<
    string,
    { content: string; speaker: string; timestamp: string }
  >;
  isCallActive: boolean;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  showScrollToBottom: boolean;
  onScrollToBottom: () => void;
}

const formatTimestamp = (timestamp: string): string => {
  try {
    return format(new Date(timestamp), "h:mm a");
  } catch {
    return "";
  }
};

export const DarkConversationThread = ({
  conversationHistory,
  liveTranscripts,
  isCallActive,
  isLoading,
  messagesEndRef,
  scrollAreaRef,
  showScrollToBottom,
  onScrollToBottom,
}: DarkConversationThreadProps) => {
  const isEmpty =
    conversationHistory.length === 0 && liveTranscripts.size === 0;

  if (isEmpty && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <MessageSquare className="h-10 w-10 text-stone-300 mb-3" />
        <p className="text-sm text-stone-500 text-center">
          No messages yet. Start a conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative min-h-0">
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {isLoading && conversationHistory.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-stone-500 text-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-stone-300 animate-pulse" />
              <div className="h-1.5 w-1.5 rounded-full bg-stone-300 animate-pulse [animation-delay:200ms]" />
              <div className="h-1.5 w-1.5 rounded-full bg-stone-300 animate-pulse [animation-delay:400ms]" />
              <span className="ml-1">Loading messages...</span>
            </div>
          </div>
        )}

        {conversationHistory.map((message) => {
          // System messages: centered, no bubble
          if (message.sentBy === "system") {
            return (
              <div key={message.id} className="flex justify-center">
                <p className="text-stone-400 text-[11px] italic max-w-[85%] text-center">
                  {message.content}
                  {message.timestamp && (
                    <span className="ml-2 text-[10px] text-stone-300">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  )}
                </p>
              </div>
            );
          }

          const isUser = message.sentBy === "user";
          const isHumanAgent = message.sentBy === "human_agent";

          return (
            <div
              key={message.id}
              className={cn(
                "flex",
                isUser ? "justify-start" : "justify-end"
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] px-3.5 py-2.5",
                  isUser &&
                    "bg-stone-100 rounded-lg text-stone-800",
                  !isUser &&
                    !isHumanAgent &&
                    "bg-blue-50 rounded-lg text-stone-800 border border-blue-100",
                  isHumanAgent &&
                    "bg-amber-50 rounded-lg text-stone-800 border border-amber-100"
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {(message.type === "voice" || message.type === "call") && (
                    <Mic className="h-3 w-3 opacity-40 inline mr-1" />
                  )}
                  {message.content}
                </p>

                <div className="flex items-center justify-end gap-1.5 mt-1">
                  {message.status === "failed" && (
                    <span className="text-[10px] text-red-500">Failed</span>
                  )}
                  <span
                    className={cn(
                      "text-[10px]",
                      isUser ? "text-stone-400" : "text-stone-400"
                    )}
                  >
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Live transcripts - pulsing partial text */}
        {Array.from(liveTranscripts.entries()).map(([id, transcript]) => {
          const isUserSpeaking =
            transcript.speaker === "user" || transcript.speaker === "customer";
          return (
            <div
              key={`live-${id}`}
              className={cn(
                "flex",
                isUserSpeaking ? "justify-start" : "justify-end"
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] px-3.5 py-2.5 opacity-70",
                  isUserSpeaking
                    ? "bg-stone-50 rounded-lg border-l-2 border-blue-300"
                    : "bg-stone-50 rounded-lg border-l-2 border-blue-300"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Mic className="h-3 w-3 text-stone-400 animate-pulse" />
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider font-medium">
                    Live
                  </span>
                  <span className="flex gap-0.5">
                    <span className="h-1 w-1 rounded-full bg-blue-400 animate-pulse" />
                    <span className="h-1 w-1 rounded-full bg-blue-400 animate-pulse [animation-delay:200ms]" />
                    <span className="h-1 w-1 rounded-full bg-blue-400 animate-pulse [animation-delay:400ms]" />
                  </span>
                </div>
                <p
                  className={cn(
                    "text-sm leading-relaxed italic",
                    isUserSpeaking ? "text-stone-600" : "text-stone-700"
                  )}
                >
                  {transcript.content}
                </p>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll-to-bottom floating button */}
      {showScrollToBottom && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <Button
            size="sm"
            onClick={onScrollToBottom}
            className="h-8 rounded-full bg-white hover:bg-stone-50 text-stone-600 border border-stone-200 shadow-card px-3"
          >
            <ArrowDown className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">New messages</span>
          </Button>
        </div>
      )}
    </div>
  );
};

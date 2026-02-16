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
        <MessageSquare className="h-10 w-10 text-zinc-700 mb-3" />
        <p className="text-sm text-zinc-500 text-center">
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
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-pulse" />
              <div className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-pulse [animation-delay:200ms]" />
              <div className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-pulse [animation-delay:400ms]" />
              <span className="ml-1">Loading messages...</span>
            </div>
          </div>
        )}

        {conversationHistory.map((message) => {
          // System messages: centered, no bubble
          if (message.sentBy === "system") {
            return (
              <div key={message.id} className="flex justify-center">
                <p className="text-zinc-500 text-xs italic max-w-[85%] text-center">
                  {message.content}
                  {message.timestamp && (
                    <span className="ml-2 text-[10px] text-zinc-600">
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
                    "bg-zinc-800 rounded-2xl rounded-bl-md text-zinc-100",
                  !isUser &&
                    !isHumanAgent &&
                    "bg-blue-600/90 rounded-2xl rounded-br-md text-white",
                  isHumanAgent &&
                    "bg-amber-600/90 rounded-2xl rounded-br-md text-white"
                )}
              >
                {/* Voice badge */}
                {(message.type === "voice" || message.type === "call") && (
                  <div className="flex items-center gap-1 mb-1">
                    <Mic className="h-3 w-3 opacity-60" />
                    <span className="text-[10px] opacity-60 uppercase tracking-wider font-medium">
                      Voice
                    </span>
                  </div>
                )}

                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.content}
                </p>

                <div className="flex items-center justify-end gap-1.5 mt-1">
                  {message.status === "failed" && (
                    <span className="text-[10px] text-red-400">Failed</span>
                  )}
                  <span
                    className={cn(
                      "text-[10px]",
                      isUser ? "text-zinc-500" : "text-white/50"
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
                    ? "bg-zinc-800/60 rounded-2xl rounded-bl-md"
                    : "bg-blue-600/50 rounded-2xl rounded-br-md"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Mic className="h-3 w-3 text-zinc-400 animate-pulse" />
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">
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
                    isUserSpeaking ? "text-zinc-300" : "text-white/80"
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
            className="h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 shadow-lg shadow-black/30 px-3"
          >
            <ArrowDown className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">New messages</span>
          </Button>
        </div>
      )}
    </div>
  );
};

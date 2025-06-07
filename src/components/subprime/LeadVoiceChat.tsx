import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";

interface ChatMessage {
  type: "user" | "ai";
  content: string;
  timestamp: Date;
}

export const LeadVoiceChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      type: "ai",
      content:
        "Hello! I'm Jack, your automotive AI assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const convaiSessionRef = useRef<any>(null);
  const lastTypedMessageRef = useRef<string>("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const widget = document.querySelector("elevenlabs-convai") as any;
    if (!widget || typeof widget.startSession !== "function") return;

    let stop: (() => void) | undefined;

    widget
      .startSession({
        transcript: true,
        textInput: true,
        onMessage: ({ source, message }: { source: string; message: string }) => {
          if (!message) return;
          if (source === "user" && message === lastTypedMessageRef.current) {
            lastTypedMessageRef.current = "";
            return;
          }
          setMessages((prev) => [
            ...prev,
            {
              type: source === "ai" ? "ai" : "user",
              content: message,
              timestamp: new Date(),
            },
          ]);
          if (source === "ai") {
            setIsTyping(false);
          }
        },
      })
      .then((session: { stop: () => void; sendMessage?: (m: string) => void }) => {
        convaiSessionRef.current = session;
        stop = session.stop;
      })
      .catch((err: unknown) => {
        console.error("Failed to start ElevenLabs convai session", err);
      });

    return () => {
      if (typeof stop === "function") stop();
      convaiSessionRef.current = null;
    };
  }, []);

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    const newUserMessage: ChatMessage = {
      type: "user",
      content: currentMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUserMessage]);
    lastTypedMessageRef.current = currentMessage;
    convaiSessionRef.current?.sendMessage?.(currentMessage);
    setCurrentMessage("");

    setIsTyping(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const simulateVoiceInput = () => {
    setIsRecording(true);

    setTimeout(() => {
      setIsRecording(false);

      lastTypedMessageRef.current = "";
    }, 2000);
  };

  return (
    <Card className="flex flex-col h-full m-0 p-0">
      <ChatHeader
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => setVoiceEnabled((v) => !v)}
      />
      <CardContent className="flex-grow p-0 border-t overflow-hidden">
        <ChatMessages
          messages={messages}
          isTyping={isTyping}
          messagesEndRef={messagesEndRef}
        />
      </CardContent>
      <ChatInput
        currentMessage={currentMessage}
        setCurrentMessage={setCurrentMessage}
        handleSendMessage={handleSendMessage}
        handleKeyDown={handleKeyDown}
        simulateVoiceInput={simulateVoiceInput}
        isRecording={isRecording}
        inputRef={inputRef}
      />
      <elevenlabs-convai
        agent-id="agent_01jwc5v1nafjwv7zw4vtz1050m"
        transcript
        text-input
        className={voiceEnabled ? "" : "hidden"}
      ></elevenlabs-convai>
    </Card>
  );
};

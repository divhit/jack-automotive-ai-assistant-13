import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { chatExamples } from "@/data";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatExamples } from "@/components/chat/ChatExamples";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import {
  CommunicationStyle,
  DEFAULT_COMMUNICATION_STYLE,
} from "@/hooks/useMessageGenerator";

interface ChatMessage {
  type: "user" | "ai";
  content: string;
  timestamp: Date;
}

const ChatWithJack = () => {
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

  // Communication style settings
  const [communicationStyle, setCommunicationStyle] =
    useState<CommunicationStyle>(DEFAULT_COMMUNICATION_STYLE);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Initialize ElevenLabs voice session and forward transcripts to chat
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

      const randomExample =
        chatExamples[Math.floor(Math.random() * chatExamples.length)];
      setCurrentMessage(randomExample.query);

      inputRef.current?.focus();
    }, 2000);
  };

  const handleStyleChange = (newStyle: CommunicationStyle) => {
    setCommunicationStyle(newStyle);
  };

  return (
    <div className="flex flex-col h-full m-0 p-0">
      <Card className="flex flex-col h-full m-0 p-0">
        <ChatHeader
          communicationStyle={communicationStyle}
          onStyleChange={handleStyleChange}
          voiceEnabled={voiceEnabled}
          onToggleVoice={() => setVoiceEnabled((v) => !v)}
        />
        <CardContent className="flex-grow p-0 border-t overflow-hidden">
          <ChatExamples setCurrentMessage={setCurrentMessage} />
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
      </Card>
      <elevenlabs-convai
        agent-id="agent_01jwc5v1nafjwv7zw4vtz1050m"
        transcript
        text-input
        className={voiceEnabled ? '' : 'hidden'}
      ></elevenlabs-convai>
    </div>
  );
};

export default ChatWithJack;

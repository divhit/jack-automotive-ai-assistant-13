
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
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  // Communication style settings
  const [communicationStyle, setCommunicationStyle] =
    useState<CommunicationStyle>(DEFAULT_COMMUNICATION_STYLE);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Initialize ElevenLabs voice session and integrate with chat
  useEffect(() => {
    const widget = document.querySelector("elevenlabs-convai") as any;
    if (!widget || typeof widget.startSession !== "function") {
      console.log("ElevenLabs widget not found, retrying...");
      const retryTimeout = setTimeout(() => {
        // Retry after a short delay to ensure widget is loaded
        const retryWidget = document.querySelector("elevenlabs-convai") as any;
        if (retryWidget && typeof retryWidget.startSession === "function") {
          initializeWidget(retryWidget);
        }
      }, 1000);
      return () => clearTimeout(retryTimeout);
    }

    function initializeWidget(widget: any) {
      let stop: (() => void) | undefined;

      widget
        .startSession({
          transcript: true,
          textInput: true,
          onMessage: ({ source, message }: { source: string; message: string }) => {
            console.log("ElevenLabs message received:", { source, message });
            
            if (!message) return;
            
            // Skip if this is the same message we just sent from text input
            if (source === "user" && message === lastTypedMessageRef.current) {
              lastTypedMessageRef.current = "";
              return;
            }

            // Add all messages to the main chat
            setMessages((prev) => {
              const newMessage = {
                type: source === "ai" ? "ai" : "user",
                content: message,
                timestamp: new Date(),
              } as ChatMessage;
              
              console.log("Adding message to main chat:", newMessage);
              return [...prev, newMessage];
            });

            if (source === "ai") {
              setIsTyping(false);
            }
          },
          onModeChange: ({ mode }: { mode: string }) => {
            console.log("ElevenLabs mode changed:", mode);
            setIsVoiceMode(mode === "voice");
          },
          onConnect: () => {
            console.log("ElevenLabs session connected");
          },
          onDisconnect: () => {
            console.log("ElevenLabs session disconnected");
            setIsVoiceMode(false);
          },
        })
        .then((session: { 
          stop: () => void; 
          sendMessage?: (m: string) => void;
          setMode?: (mode: string) => void;
        }) => {
          console.log("ElevenLabs session started successfully");
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
    }

    return initializeWidget(widget);
  }, []);

  // Send chat history as context when switching to voice mode
  const sendChatHistoryAsContext = () => {
    if (!convaiSessionRef.current?.sendMessage) {
      console.log("No ElevenLabs session available for context");
      return;
    }

    // Create a context summary from recent messages
    const recentMessages = messages.slice(-10); // Last 10 messages for context
    const contextSummary = recentMessages
      .map(msg => `${msg.type === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n");

    console.log("Sending chat history as context:", contextSummary);
    
    // Send context to ElevenLabs (this will be handled by the agent's system prompt)
    if (contextSummary) {
      convaiSessionRef.current.sendMessage(`[CONTEXT] Previous conversation:\n${contextSummary}`);
    }
  };

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    const newUserMessage: ChatMessage = {
      type: "user",
      content: currentMessage,
      timestamp: new Date(),
    };
    
    console.log("Sending user message:", newUserMessage);
    setMessages((prev) => [...prev, newUserMessage]);
    lastTypedMessageRef.current = currentMessage;
    
    // Send to ElevenLabs widget
    if (convaiSessionRef.current?.sendMessage) {
      console.log("Forwarding message to ElevenLabs:", currentMessage);
      convaiSessionRef.current.sendMessage(currentMessage);
    } else {
      console.log("No ElevenLabs session available, message not forwarded");
    }
    
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

  const toggleVoiceMode = () => {
    if (!voiceEnabled) return;

    console.log("Toggling voice mode. Current mode:", isVoiceMode ? "voice" : "text");

    if (isVoiceMode) {
      // Switching from voice to text - context is already preserved in messages
      console.log("Switching to text mode");
      convaiSessionRef.current?.setMode?.("text");
    } else {
      // Switching from text to voice - send chat history as context
      console.log("Switching to voice mode, sending context");
      sendChatHistoryAsContext();
      convaiSessionRef.current?.setMode?.("voice");
    }
  };

  const handleToggleVoice = () => {
    setVoiceEnabled((v) => {
      const newVoiceEnabled = !v;
      console.log("Voice enabled toggled:", newVoiceEnabled);
      if (!newVoiceEnabled) {
        // If disabling voice, switch to text mode
        setIsVoiceMode(false);
        convaiSessionRef.current?.setMode?.("text");
      }
      return newVoiceEnabled;
    });
  };

  return (
    <div className="flex flex-col h-full m-0 p-0">
      <Card className="flex flex-col h-full m-0 p-0">
        <ChatHeader
          communicationStyle={communicationStyle}
          onStyleChange={handleStyleChange}
          voiceEnabled={voiceEnabled}
          onToggleVoice={handleToggleVoice}
          isVoiceMode={isVoiceMode}
          onToggleMode={toggleVoiceMode}
        />
        <CardContent className="flex-grow p-0 border-t overflow-hidden">
          <ChatExamples setCurrentMessage={setCurrentMessage} />
          <ChatMessages
            messages={messages}
            isTyping={isTyping}
            messagesEndRef={messagesEndRef}
            isVoiceMode={isVoiceMode}
          />
        </CardContent>
        {!isVoiceMode && (
          <ChatInput
            currentMessage={currentMessage}
            setCurrentMessage={setCurrentMessage}
            handleSendMessage={handleSendMessage}
            handleKeyDown={handleKeyDown}
            simulateVoiceInput={simulateVoiceInput}
            isRecording={isRecording}
            inputRef={inputRef}
          />
        )}
      </Card>
      
      {/* ElevenLabs widget - always rendered but hidden when voice disabled */}
      <elevenlabs-convai
        agent-id="agent_01jwc5v1nafjwv7zw4vtz1050m"
        transcript
        text-input
        className={voiceEnabled ? (isVoiceMode ? 'block' : 'hidden') : 'hidden'}
      ></elevenlabs-convai>
    </div>
  );
};

export default ChatWithJack;

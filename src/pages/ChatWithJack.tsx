
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { chatExamples } from "@/data";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatExamples } from "@/components/chat/ChatExamples";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { useMessageGenerator, CommunicationStyle, DEFAULT_COMMUNICATION_STYLE } from "@/hooks/useMessageGenerator";

interface ChatMessage {
  type: "user" | "ai";
  content: string;
  timestamp: Date;
}

const ChatWithJack = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      type: "ai",
      content: "Hello! I'm Jack, your automotive AI assistant. How can I help you today?",
      timestamp: new Date()
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { generateResponse } = useMessageGenerator();
  
  // Communication style settings
  const [communicationStyle, setCommunicationStyle] = useState<CommunicationStyle>(DEFAULT_COMMUNICATION_STYLE);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    const newUserMessage: ChatMessage = {
      type: "user",
      content: currentMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);
    setCurrentMessage("");

    setIsTyping(true);
    
    setTimeout(() => {
      const responseContent = generateResponse(newUserMessage.content, communicationStyle);
      const newAiMessage: ChatMessage = {
        type: "ai",
        content: responseContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newAiMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
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
      
      const randomExample = chatExamples[Math.floor(Math.random() * chatExamples.length)];
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
    </div>
  );
};

export default ChatWithJack;

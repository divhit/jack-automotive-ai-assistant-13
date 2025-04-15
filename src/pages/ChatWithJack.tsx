
import { useState, useRef, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, Send, Car, Info, ChevronsDown } from "lucide-react";
import { chatExamples, jackResponses } from "@/data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus on input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const generateResponse = (query: string): string => {
    if (query.toLowerCase().includes("optimal price") || query.toLowerCase().includes("pricing")) {
      const stockNumberMatch = query.match(/#([A-Za-z0-9]+)/);
      if (stockNumberMatch) {
        return jackResponses.getPricingRecommendation(stockNumberMatch[1]);
      }
    }

    if (query.toLowerCase().includes("compare") || query.toLowerCase().includes("similar")) {
      const yearMakeModelMatch = query.match(/(\d{4})\s+([A-Za-z-]+)\s+([A-Za-z0-9]+)/);
      if (yearMakeModelMatch) {
        return jackResponses.getMarketComparison(yearMakeModelMatch[0]);
      }
    }

    if (query.toLowerCase().includes("trend") || query.toLowerCase().includes("trending")) {
      return jackResponses.getTrendingVehicles();
    }

    if (query.toLowerCase().includes("details")) {
      const stockNumberMatch = query.match(/#([A-Za-z0-9]+)/);
      if (stockNumberMatch) {
        return jackResponses.getVehicleDetails(stockNumberMatch[1]);
      }
    }

    if (query.toLowerCase().includes("pricing opportunit") || query.toLowerCase().includes("price adjustment")) {
      return jackResponses.getPricingOpportunities();
    }

    return jackResponses.getGenericResponse(query);
  };

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    // Add user message
    const newUserMessage: ChatMessage = {
      type: "user",
      content: currentMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);
    setCurrentMessage("");

    // Simulate AI typing
    setIsTyping(true);
    
    // Generate and add AI response after a delay
    setTimeout(() => {
      const responseContent = generateResponse(newUserMessage.content);
      const newAiMessage: ChatMessage = {
        type: "ai",
        content: responseContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newAiMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const simulateVoiceInput = () => {
    setIsRecording(true);
    
    // Simulate voice recording for 2 seconds
    setTimeout(() => {
      setIsRecording(false);
      
      // Choose a random example query
      const randomExample = chatExamples[Math.floor(Math.random() * chatExamples.length)];
      setCurrentMessage(randomExample.query);
      
      // Focus on input
      inputRef.current?.focus();
    }, 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-13rem)]">
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">
            <div className="flex items-center space-x-2">
              <Car className="h-5 w-5 text-automotive-primary" />
              <span>Chat with Jack</span>
            </div>
          </CardTitle>
          <div className="text-sm text-muted-foreground flex items-center mt-1">
            <Info className="h-3.5 w-3.5 mr-1.5" />
            <span>Ask Jack any questions about inventory, pricing, or market conditions</span>
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-0 border-t">
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex flex-wrap gap-2">
              {chatExamples.slice(0, 3).map((example, index) => (
                <Button 
                  key={index} 
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                  onClick={() => setCurrentMessage(example.query)}
                >
                  {example.query.length > 50 ? example.query.substring(0, 50) + "..." : example.query}
                </Button>
              ))}
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs flex items-center"
              >
                <span>More examples</span>
                <ChevronsDown className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
          
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
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="pt-4 border-t">
          <div className="flex w-full space-x-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={simulateVoiceInput}
              className={isRecording ? "bg-red-100 text-red-500 animate-pulse" : ""}
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Input
              ref={inputRef}
              type="text"
              placeholder="Type your question here..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button size="icon" onClick={handleSendMessage} disabled={!currentMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ChatWithJack;

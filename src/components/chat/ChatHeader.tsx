
import { CardHeader } from "@/components/ui/card";
import { Bot, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChatStyleSettings } from "./ChatStyleSettings";
import { CommunicationStyle } from "@/hooks/useMessageGenerator";

interface ChatHeaderProps {
  communicationStyle?: CommunicationStyle;
  onStyleChange?: (style: CommunicationStyle) => void;
}

export const ChatHeader = ({ communicationStyle, onStyleChange }: ChatHeaderProps) => {
  return (
    <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-automotive-primary text-white relative">
      <div className="flex items-center space-x-2">
        <Bot className="h-6 w-6" />
        <div>
          <h2 className="text-lg font-semibold leading-none tracking-tight">Jack AI</h2>
          <p className="text-xs text-white/80">Automotive Sales Assistant</p>
        </div>
      </div>
      
      <div className="flex items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="rounded-full p-1 hover:bg-white/10">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="w-[200px] text-xs">
                Jack AI uses market data to assist with inventory management, pricing, and customer interactions.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {communicationStyle && onStyleChange && (
          <ChatStyleSettings 
            currentStyle={communicationStyle} 
            onStyleChange={onStyleChange} 
          />
        )}
      </div>
    </CardHeader>
  );
};


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
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
}

export const ChatHeader = ({ communicationStyle, onStyleChange, voiceEnabled, onToggleVoice }: ChatHeaderProps) => {
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

        {onToggleVoice && (
          <button
            onClick={onToggleVoice}
            className="rounded-full p-1 hover:bg-white/10 ml-2"
          >
            {voiceEnabled ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2Z" />
                <path d="M19 10v1a7 7 0 0 1-14 0v-1" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M9 5v6a3 3 0 0 0 6 0V5a3 3 0 0 0-6 0Z" />
                <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 19v2m4 0H8" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            )}
          </button>
        )}
        
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

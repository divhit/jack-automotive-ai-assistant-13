
import { CardHeader } from "@/components/ui/card";
import { Bot, Info, Mic, MessageSquare } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ChatStyleSettings } from "./ChatStyleSettings";
import { CommunicationStyle } from "@/hooks/useMessageGenerator";

interface ChatHeaderProps {
  communicationStyle?: CommunicationStyle;
  onStyleChange?: (style: CommunicationStyle) => void;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  isVoiceMode?: boolean;
  onToggleMode?: () => void;
}

export const ChatHeader = ({ 
  communicationStyle, 
  onStyleChange, 
  voiceEnabled, 
  onToggleVoice,
  isVoiceMode,
  onToggleMode
}: ChatHeaderProps) => {
  return (
    <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-automotive-primary text-white relative">
      <div className="flex items-center space-x-2">
        <Bot className="h-6 w-6" />
        <div>
          <h2 className="text-lg font-semibold leading-none tracking-tight">Jack AI</h2>
          <p className="text-xs text-white/80">
            Automotive Sales Assistant • {isVoiceMode ? "Voice Mode" : "Text Mode"}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {/* Voice/Text Mode Toggle */}
        {voiceEnabled && onToggleMode && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleMode}
                  className="text-white hover:bg-white/10 px-2"
                >
                  {isVoiceMode ? (
                    <MessageSquare className="h-4 w-4 mr-1" />
                  ) : (
                    <Mic className="h-4 w-4 mr-1" />
                  )}
                  <span className="text-xs">
                    {isVoiceMode ? "Switch to Text" : "Switch to Voice"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Switch between voice and text modes</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

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
                {voiceEnabled && " Switch between voice and text modes while maintaining conversation context."}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {onToggleVoice && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleVoice}
                  className="rounded-full p-1 hover:bg-white/10"
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
              </TooltipTrigger>
              <TooltipContent>
                <p>{voiceEnabled ? "Disable voice features" : "Enable voice features"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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

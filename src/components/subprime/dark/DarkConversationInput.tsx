import React, { useState, useCallback } from "react";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Send,
  UserCheck,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DarkConversationInputProps {
  textInput: string;
  onTextInputChange: (val: string) => void;
  onSendMessage: () => void;
  onStartVoiceCall: () => void;
  onManualCall: () => void;
  onEndManualCall: () => void;
  isCallActive: boolean;
  isManualCallActive: boolean;
  isAutoMode: boolean;
  onToggleAutoMode: (val: boolean) => void;
  isUnderHumanControl: boolean;
  onSendHumanMessage: (msg: string) => void;
  onJoinHumanControl: () => void;
  onLeaveHumanControl: () => void;
  humanControlAgent: string | null;
  currentMode: "text" | "voice";
}

export const DarkConversationInput = ({
  textInput,
  onTextInputChange,
  onSendMessage,
  onStartVoiceCall,
  onManualCall,
  onEndManualCall,
  isCallActive,
  isManualCallActive,
  isAutoMode,
  onToggleAutoMode,
  isUnderHumanControl,
  onSendHumanMessage,
  onJoinHumanControl,
  onLeaveHumanControl,
  humanControlAgent,
  currentMode,
}: DarkConversationInputProps) => {
  const [humanInput, setHumanInput] = useState("");

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (isUnderHumanControl) {
          if (humanInput.trim()) {
            onSendHumanMessage(humanInput.trim());
            setHumanInput("");
          }
        } else {
          onSendMessage();
        }
      }
    },
    [isUnderHumanControl, humanInput, onSendHumanMessage, onSendMessage]
  );

  const handleSendClick = () => {
    if (isUnderHumanControl) {
      if (humanInput.trim()) {
        onSendHumanMessage(humanInput.trim());
        setHumanInput("");
      }
    } else {
      onSendMessage();
    }
  };

  const anyCallActive = isCallActive || isManualCallActive;

  return (
    <div className="bg-white border-t border-stone-200 px-4 py-3 space-y-2.5">
      {/* Top row: Auto/Manual toggle + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id="auto-mode"
            checked={isAutoMode}
            onCheckedChange={onToggleAutoMode}
            className="h-4 w-7 data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-stone-300"
          />
          <Label
            htmlFor="auto-mode"
            className="text-xs text-stone-500 cursor-pointer select-none"
          >
            {isAutoMode ? "Auto" : "Manual"}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          {anyCallActive && (
            <span className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-600">
                {isManualCallActive ? "Manual call active" : "AI call active"}
              </span>
            </span>
          )}
          {!anyCallActive && !isUnderHumanControl && (
            <span className="text-[10px] text-stone-400 uppercase tracking-wider">
              {currentMode === "voice" ? "Voice" : "Text"} mode
            </span>
          )}
        </div>
      </div>

      {/* Human control banner */}
      {isUnderHumanControl && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-amber-700">
              Human control active
              {humanControlAgent && (
                <span className="text-amber-500 ml-1">
                  ({humanControlAgent})
                </span>
              )}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onLeaveHumanControl}
            className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          >
            <LogOut className="h-3 w-3 mr-1" />
            Leave
          </Button>
        </div>
      )}

      {/* Main input row */}
      <div className="flex items-end gap-2">
        <textarea
          rows={2}
          value={isUnderHumanControl ? humanInput : textInput}
          onChange={(e) =>
            isUnderHumanControl
              ? setHumanInput(e.target.value)
              : onTextInputChange(e.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder={
            isUnderHumanControl
              ? "Type as human agent..."
              : "Type a message..."
          }
          className={cn(
            "flex-1 resize-none rounded-lg px-3 py-2 text-[13px] leading-relaxed",
            "bg-stone-50 border border-stone-200 text-stone-900",
            "placeholder:text-stone-400",
            "focus:outline-none focus:ring-0 focus:border-blue-300 focus:bg-white",
            "scrollbar-thin scrollbar-thumb-stone-300"
          )}
        />
        <Button
          onClick={handleSendClick}
          disabled={
            isUnderHumanControl
              ? !humanInput.trim()
              : !textInput.trim()
          }
          className="h-[52px] w-10 bg-blue-600 hover:bg-blue-700 disabled:bg-stone-100 disabled:text-stone-400 transition-colors duration-150 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Bottom row: action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Jack AI Call */}
        {!anyCallActive && (
          <Button
            size="sm"
            onClick={onStartVoiceCall}
            className="h-8 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 shadow-sm text-xs px-3 transition-all duration-150"
          >
            <Phone className="h-3.5 w-3.5 mr-1.5" />
            Jack Call
          </Button>
        )}

        {/* Manual Call */}
        {!anyCallActive && (
          <Button
            size="sm"
            onClick={onManualCall}
            className="h-8 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 shadow-sm text-xs px-3 transition-all duration-150"
          >
            <PhoneCall className="h-3.5 w-3.5 mr-1.5" />
            Manual Call
          </Button>
        )}

        {isManualCallActive && (
          <Button
            size="sm"
            onClick={onEndManualCall}
            className="h-8 bg-red-500 hover:bg-red-600 text-white text-xs px-3 transition-colors duration-150"
          >
            <PhoneOff className="h-3.5 w-3.5 mr-1.5" />
            End Manual Call
          </Button>
        )}

        {/* Human control actions */}
        {!isUnderHumanControl && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onJoinHumanControl}
            className="h-8 text-xs text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors duration-150 px-3 ml-auto"
          >
            <UserCheck className="h-3.5 w-3.5 mr-1.5" />
            Join as Human
          </Button>
        )}

        {isUnderHumanControl && (
          <Button
            size="sm"
            onClick={() => {
              if (humanInput.trim()) {
                onSendHumanMessage(humanInput.trim());
                setHumanInput("");
              }
            }}
            disabled={!humanInput.trim()}
            className="h-8 bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 ml-auto disabled:bg-stone-100 disabled:text-stone-400 transition-colors duration-150"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Send as Human
          </Button>
        )}
      </div>
    </div>
  );
};

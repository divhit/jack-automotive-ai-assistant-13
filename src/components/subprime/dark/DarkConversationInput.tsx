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
    <div className="bg-zinc-950 border-t border-white/[0.06] px-4 py-3 space-y-2.5">
      {/* Top row: Auto/Manual toggle + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id="auto-mode"
            checked={isAutoMode}
            onCheckedChange={onToggleAutoMode}
            className="h-4 w-7 data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-zinc-700"
          />
          <Label
            htmlFor="auto-mode"
            className="text-xs text-zinc-400 cursor-pointer select-none"
          >
            {isAutoMode ? "Auto" : "Manual"}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          {anyCallActive && (
            <span className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400">
                {isManualCallActive ? "Manual call active" : "AI call active"}
              </span>
            </span>
          )}
          {!anyCallActive && !isUnderHumanControl && (
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
              {currentMode === "voice" ? "Voice" : "Text"} mode
            </span>
          )}
        </div>
      </div>

      {/* Human control banner */}
      {isUnderHumanControl && (
        <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-amber-300">
              Human control active
              {humanControlAgent && (
                <span className="text-amber-400/70 ml-1">
                  ({humanControlAgent})
                </span>
              )}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onLeaveHumanControl}
            className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
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
            "bg-white/[0.04] border border-white/[0.06] text-zinc-200",
            "placeholder:text-zinc-600",
            "focus:outline-none focus:ring-0 focus:border-white/[0.12] focus:bg-white/[0.06]",
            "scrollbar-thin scrollbar-thumb-zinc-700"
          )}
        />
        <Button
          onClick={handleSendClick}
          disabled={
            isUnderHumanControl
              ? !humanInput.trim()
              : !textInput.trim()
          }
          className="h-[52px] w-10 bg-blue-600 hover:bg-blue-500 disabled:bg-white/[0.04] disabled:text-zinc-600 transition-colors duration-150 shrink-0"
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
            className="h-8 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 border border-white/[0.08] text-xs px-3 transition-all duration-150"
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
            className="h-8 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 border border-white/[0.08] text-xs px-3 transition-all duration-150"
          >
            <PhoneCall className="h-3.5 w-3.5 mr-1.5" />
            Manual Call
          </Button>
        )}

        {isManualCallActive && (
          <Button
            size="sm"
            onClick={onEndManualCall}
            className="h-8 bg-red-600/80 hover:bg-red-600 text-white text-xs px-3 transition-colors duration-150"
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
            className="h-8 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors duration-150 px-3 ml-auto"
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
            className="h-8 bg-amber-600/80 hover:bg-amber-600 text-white text-xs px-3 ml-auto disabled:bg-white/[0.04] disabled:text-zinc-600 transition-colors duration-150"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Send as Human
          </Button>
        )}
      </div>
    </div>
  );
};

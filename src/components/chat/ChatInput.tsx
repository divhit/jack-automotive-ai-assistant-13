
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, Send } from "lucide-react";
import { CardFooter } from "@/components/ui/card";

interface ChatInputProps {
  currentMessage: string;
  setCurrentMessage: (message: string) => void;
  handleSendMessage: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  simulateVoiceInput: () => void;
  isRecording: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
}

export const ChatInput = ({
  currentMessage,
  setCurrentMessage,
  handleSendMessage,
  handleKeyDown,
  simulateVoiceInput,
  isRecording,
  inputRef
}: ChatInputProps) => {
  return (
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
  );
};

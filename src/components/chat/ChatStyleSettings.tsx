
import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  ToggleGroup,
  ToggleGroupItem 
} from "@/components/ui/toggle-group";
import { CommunicationStyle, DEFAULT_COMMUNICATION_STYLE } from "@/hooks/useMessageGenerator";
import { Settings2 } from "lucide-react";

interface ChatStyleSettingsProps {
  currentStyle: CommunicationStyle;
  onStyleChange: (style: CommunicationStyle) => void;
}

export const ChatStyleSettings = ({ 
  currentStyle, 
  onStyleChange 
}: ChatStyleSettingsProps) => {
  const [open, setOpen] = useState(false);
  const [tempStyle, setTempStyle] = useState<CommunicationStyle>(currentStyle);

  const handleOpen = () => {
    setTempStyle(currentStyle);
    setOpen(true);
  };

  const handleSave = () => {
    onStyleChange(tempStyle);
    setOpen(false);
  };

  const handleReset = () => {
    setTempStyle(DEFAULT_COMMUNICATION_STYLE);
  };

  const handleToneChange = (value: string) => {
    if (value) {
      setTempStyle(prev => ({
        ...prev,
        tone: value as "professional" | "balanced" | "conversational"
      }));
    }
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-2 right-2" 
        onClick={handleOpen}
        title="Jack Communication Settings"
      >
        <Settings2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Jack Communication Style</DialogTitle>
            <DialogDescription>
              Adjust how Jack communicates with customers
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <h3 className="text-sm font-medium mb-3">Conversation Tone</h3>
              <ToggleGroup 
                type="single" 
                value={tempStyle.tone}
                onValueChange={handleToneChange}
                className="grid grid-cols-3 gap-2"
              >
                <ToggleGroupItem value="professional" className="data-[state=on]:bg-blue-50 data-[state=on]:text-blue-700 data-[state=on]:border-blue-200">
                  <div className="text-center p-1">
                    <h4 className="font-medium text-xs">Professional</h4>
                    <p className="text-xs text-gray-500">Formal, direct</p>
                  </div>
                </ToggleGroupItem>
                <ToggleGroupItem value="balanced" className="data-[state=on]:bg-purple-50 data-[state=on]:text-purple-700 data-[state=on]:border-purple-200">
                  <div className="text-center p-1">
                    <h4 className="font-medium text-xs">Balanced</h4>
                    <p className="text-xs text-gray-500">Friendly yet professional</p>
                  </div>
                </ToggleGroupItem>
                <ToggleGroupItem value="conversational" className="data-[state=on]:bg-green-50 data-[state=on]:text-green-700 data-[state=on]:border-green-200">
                  <div className="text-center p-1">
                    <h4 className="font-medium text-xs">Conversational</h4>
                    <p className="text-xs text-gray-500">Warm, approachable</p>
                  </div>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label htmlFor="formality" className="text-sm font-medium">
                    Formality Level
                  </Label>
                  <span className="text-xs text-gray-500">
                    {tempStyle.formality}%
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2 text-xs text-gray-500">Casual</div>
                  <div className="col-span-8">
                    <Slider
                      id="formality"
                      value={[tempStyle.formality]}
                      max={100}
                      step={5}
                      onValueChange={(value) => {
                        setTempStyle(prev => ({...prev, formality: value[0]}));
                      }}
                    />
                  </div>
                  <div className="col-span-2 text-xs text-gray-500 text-right">Formal</div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <Label htmlFor="pacing" className="text-sm font-medium">
                    Communication Pace
                  </Label>
                  <span className="text-xs text-gray-500">
                    {tempStyle.pacing}%
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2 text-xs text-gray-500">Concise</div>
                  <div className="col-span-8">
                    <Slider
                      id="pacing"
                      value={[tempStyle.pacing]}
                      max={100}
                      step={5}
                      onValueChange={(value) => {
                        setTempStyle(prev => ({...prev, pacing: value[0]}));
                      }}
                    />
                  </div>
                  <div className="col-span-2 text-xs text-gray-500 text-right">Detailed</div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <Label htmlFor="empathy" className="text-sm font-medium">
                    Empathy Level
                  </Label>
                  <span className="text-xs text-gray-500">
                    {tempStyle.empathy}%
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2 text-xs text-gray-500">Neutral</div>
                  <div className="col-span-8">
                    <Slider
                      id="empathy"
                      value={[tempStyle.empathy]}
                      max={100}
                      step={5}
                      onValueChange={(value) => {
                        setTempStyle(prev => ({...prev, empathy: value[0]}));
                      }}
                    />
                  </div>
                  <div className="col-span-2 text-xs text-gray-500 text-right">Empathetic</div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <Label htmlFor="persistence" className="text-sm font-medium">
                    Follow-up Style
                  </Label>
                  <span className="text-xs text-gray-500">
                    {tempStyle.persistence}%
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2 text-xs text-gray-500">Gentle</div>
                  <div className="col-span-8">
                    <Slider
                      id="persistence"
                      value={[tempStyle.persistence]}
                      max={100}
                      step={5}
                      onValueChange={(value) => {
                        setTempStyle(prev => ({...prev, persistence: value[0]}));
                      }}
                    />
                  </div>
                  <div className="col-span-2 text-xs text-gray-500 text-right">Persistent</div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleReset}>Reset</Button>
            <Button onClick={handleSave}>Apply Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

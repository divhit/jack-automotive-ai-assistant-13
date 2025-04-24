
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface CommunicationStyleTabProps {
  toneSettings: {
    formality: number;
    pacing: number;
    empathy: number;
    persistence: number;
  };
  communicationStyle: string;
  onToneChange: (tone: string, value: number[]) => void;
  onCommunicationStyleChange: (value: string) => void;
}

export const CommunicationStyleTab = ({
  toneSettings,
  communicationStyle,
  onToneChange,
  onCommunicationStyleChange,
}: CommunicationStyleTabProps) => {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Conversation Style</h3>
      <ToggleGroup 
        type="single" 
        value={communicationStyle}
        onValueChange={(value) => {
          if (value) onCommunicationStyleChange(value);
        }}
        className="grid grid-cols-3 gap-2"
      >
        <ToggleGroupItem value="professional" className="data-[state=on]:bg-blue-50 data-[state=on]:text-blue-700 data-[state=on]:border-blue-200">
          <div className="text-center p-2">
            <h4 className="font-medium">Professional</h4>
            <p className="text-sm text-gray-500">Formal, direct, efficient</p>
          </div>
        </ToggleGroupItem>
        <ToggleGroupItem value="balanced" className="data-[state=on]:bg-purple-50 data-[state=on]:text-purple-700 data-[state=on]:border-purple-200">
          <div className="text-center p-2">
            <h4 className="font-medium">Balanced</h4>
            <p className="text-sm text-gray-500">Friendly yet professional</p>
          </div>
        </ToggleGroupItem>
        <ToggleGroupItem value="conversational" className="data-[state=on]:bg-green-50 data-[state=on]:text-green-700 data-[state=on]:border-green-200">
          <div className="text-center p-2">
            <h4 className="font-medium">Conversational</h4>
            <p className="text-sm text-gray-500">Warm, friendly, approachable</p>
          </div>
        </ToggleGroupItem>
      </ToggleGroup>
      
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Tone Adjustments</h3>
        
        <div className="space-y-8">
          {[
            {
              id: "pacing",
              label: "Information Gathering Pace",
              left: "Fast (concise)",
              right: "Thorough (detailed)"
            },
            {
              id: "formality",
              label: "Formality Level",
              left: "Casual",
              right: "Formal"
            },
            {
              id: "persistence",
              label: "Follow-up Persistence",
              left: "Gentle",
              right: "Persistent"
            },
            {
              id: "empathy",
              label: "Empathy Level",
              left: "Neutral",
              right: "Empathetic"
            }
          ].map((setting) => (
            <div key={setting.id}>
              <div className="flex justify-between mb-2">
                <Label htmlFor={setting.id} className="text-sm font-medium">
                  {setting.label}
                </Label>
                <span className="text-sm text-gray-500">
                  {toneSettings[setting.id as keyof typeof toneSettings]}%
                </span>
              </div>
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-2 text-xs text-gray-500">{setting.left}</div>
                <div className="col-span-8">
                  <Slider
                    id={setting.id}
                    value={[toneSettings[setting.id as keyof typeof toneSettings]]}
                    max={100}
                    step={5}
                    onValueChange={(value) => onToneChange(setting.id, value)}
                  />
                </div>
                <div className="col-span-2 text-xs text-gray-500 text-right">{setting.right}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

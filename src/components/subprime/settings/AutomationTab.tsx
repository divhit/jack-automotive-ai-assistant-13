
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface AutomationTabProps {
  scriptSettings: {
    autoFollowUp: boolean;
    creditWarnings: boolean;
    suggestOptions: boolean;
    customGreeting: string;
  };
  onScriptToggle: (setting: string) => void;
  onCustomGreetingChange: (value: string) => void;
}

export const AutomationTab = ({
  scriptSettings,
  onScriptToggle,
  onCustomGreetingChange
}: AutomationTabProps) => {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Automated Features</h3>
      <div className="space-y-4">
        {[
          {
            id: "autoFollowUp",
            label: "Automated Follow-ups",
            description: "Jack will automatically follow up with customers who haven't responded after 24 hours"
          },
          {
            id: "creditWarnings",
            label: "Credit Issue Warnings",
            description: "Notify customers when potential credit issues are detected and offer repair guidance"
          },
          {
            id: "suggestOptions",
            label: "Vehicle Suggestions",
            description: "Provide vehicle recommendations based on customer budget and credit situation"
          }
        ].map((feature) => (
          <div key={feature.id} className="flex items-start space-x-3 p-3 rounded-md border">
            <Checkbox 
              id={feature.id} 
              checked={scriptSettings[feature.id as keyof typeof scriptSettings] as boolean}
              onCheckedChange={() => onScriptToggle(feature.id)}
            />
            <div>
              <Label htmlFor={feature.id} className="font-medium">{feature.label}</Label>
              <p className="text-sm text-gray-500">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-4">Custom Greeting Message</h3>
        <textarea 
          className="w-full p-3 border rounded-md h-24"
          value={scriptSettings.customGreeting}
          onChange={(e) => onCustomGreetingChange(e.target.value)}
        />
        <p className="text-sm text-gray-500 mt-2">This is the first message Jack will send when starting a conversation with a subprime lead.</p>
      </div>
    </div>
  );
};


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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InformationGatheringTab } from "./settings/InformationGatheringTab";
import { CommunicationStyleTab } from "./settings/CommunicationStyleTab";
import { AutomationTab } from "./settings/AutomationTab";
import { toast } from "sonner";

interface SubprimeSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SubprimeSettingsDialog = ({ open, onOpenChange }: SubprimeSettingsDialogProps) => {
  const [selectedTab, setSelectedTab] = useState("information");
  const [isLoading, setIsLoading] = useState(false);
  const [formSettings, setFormSettings] = useState({
    enabledSections: {
      identity: true,
      residence: true,
      employment: true,
      credit: true,
      vehicle: true,
      consent: true,
      scheduling: true
    },
    toneSettings: {
      formality: 60,
      persistence: 45,
      empathy: 75,
      pacing: 50
    },
    scriptSettings: {
      autoFollowUp: true,
      creditWarnings: true,
      suggestOptions: true,
      customGreeting: "Hello, I'm Jack, your virtual assistant. I'm here to help you with your auto financing needs."
    },
    communicationStyle: "balanced"
  });

  const handleSectionToggle = (section: string) => {
    setFormSettings(prev => ({
      ...prev,
      enabledSections: {
        ...prev.enabledSections,
        [section]: !prev.enabledSections[section]
      }
    }));
  };

  const handleToneChange = (tone: string, value: number[]) => {
    setFormSettings(prev => ({
      ...prev,
      toneSettings: {
        ...prev.toneSettings,
        [tone]: value[0]
      }
    }));
  };

  const handleScriptToggle = (setting: string) => {
    setFormSettings(prev => ({
      ...prev,
      scriptSettings: {
        ...prev.scriptSettings,
        [setting]: !prev.scriptSettings[setting as keyof typeof prev.scriptSettings]
      }
    }));
  };

  const handleCustomGreetingChange = (value: string) => {
    setFormSettings(prev => ({
      ...prev,
      scriptSettings: {
        ...prev.scriptSettings,
        customGreeting: value
      }
    }));
  };

  const handleCommunicationStyleChange = (value: string) => {
    setFormSettings(prev => ({
      ...prev,
      communicationStyle: value
    }));
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Save settings to backend
      const response = await fetch('/api/subprime/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formSettings)
      });

      if (response.ok) {
        toast.success('Settings saved successfully');
        console.log('✅ Subprime settings saved:', formSettings);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsLoading(false);
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Jack AI Subprime Calibration</DialogTitle>
          <DialogDescription>
            Configure how Jack collects and processes subprime customer information
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full mt-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="information">Information Gathering</TabsTrigger>
            <TabsTrigger value="communication">Communication Style</TabsTrigger>
            <TabsTrigger value="automation">Automation Settings</TabsTrigger>
          </TabsList>
          
          <div className="h-[60vh] overflow-y-auto">
            <TabsContent value="information" className="mt-0 border-0">
              <InformationGatheringTab 
                enabledSections={formSettings.enabledSections}
                onSectionToggle={handleSectionToggle}
              />
            </TabsContent>
            
            <TabsContent value="communication" className="mt-0 border-0">
              <CommunicationStyleTab 
                toneSettings={formSettings.toneSettings}
                communicationStyle={formSettings.communicationStyle}
                onToneChange={handleToneChange}
                onCommunicationStyleChange={handleCommunicationStyleChange}
              />
            </TabsContent>
            
            <TabsContent value="automation" className="mt-0 border-0">
              <AutomationTab 
                scriptSettings={formSettings.scriptSettings}
                onScriptToggle={handleScriptToggle}
                onCustomGreetingChange={handleCustomGreetingChange}
              />
            </TabsContent>
          </div>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveSettings}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

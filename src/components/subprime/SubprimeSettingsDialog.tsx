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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  Card,
  CardHeader,
  CardContent,
  CardTitle
} from "@/components/ui/card";
import { 
  CircleDollarSign, 
  HomeIcon, 
  User, 
  Building, 
  Briefcase, 
  Calendar,
  MessageCircle,
  CheckCircle2,
  ClipboardCheck
} from "lucide-react";
import { 
  ToggleGroup,
  ToggleGroupItem 
} from "@/components/ui/toggle-group";

interface SubprimeSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SubprimeSettingsDialog = ({ open, onOpenChange }: SubprimeSettingsDialogProps) => {
  const [selectedTab, setSelectedTab] = useState("information");
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

  const handleSectionToggle = (section: keyof typeof formSettings.enabledSections) => {
    setFormSettings(prev => ({
      ...prev,
      enabledSections: {
        ...prev.enabledSections,
        [section]: !prev.enabledSections[section]
      }
    }));
  };

  const handleToneChange = (tone: keyof typeof formSettings.toneSettings, value: number[]) => {
    setFormSettings(prev => ({
      ...prev,
      toneSettings: {
        ...prev.toneSettings,
        [tone]: value[0]
      }
    }));
  };

  const handleScriptToggle = (setting: keyof typeof formSettings.scriptSettings) => {
    if (typeof formSettings.scriptSettings[setting] === 'boolean') {
      setFormSettings(prev => ({
        ...prev,
        scriptSettings: {
          ...prev.scriptSettings,
          [setting]: !prev.scriptSettings[setting]
        }
      }));
    }
  };

  const handleCommunicationStyleChange = (value: string) => {
    setFormSettings(prev => ({
      ...prev,
      communicationStyle: value
    }));
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

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
          <p className="text-sm text-blue-700">
            💡 Customers can provide quick answers via text or request a phone call anytime to complete their application. Our goal is to make the process as convenient as possible for them.
          </p>
        </div>
        
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full mt-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="information">Information Gathering</TabsTrigger>
            <TabsTrigger value="communication">Communication Style</TabsTrigger>
            <TabsTrigger value="automation">Automation Settings</TabsTrigger>
          </TabsList>
          
          <div className="h-[60vh] overflow-y-auto">
            <TabsContent value="information" className="mt-0 border-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className={!formSettings.enabledSections.identity ? "opacity-60" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-500" />
                        <CardTitle className="text-md">Identity & Contact</CardTitle>
                      </div>
                      <Switch 
                        checked={formSettings.enabledSections.identity}
                        onCheckedChange={() => handleSectionToggle("identity")}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Full legal name</li>
                      <li>Best phone number</li>
                      <li>Preferred email address</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className={!formSettings.enabledSections.residence ? "opacity-60" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HomeIcon className="h-5 w-5 text-green-500" />
                        <CardTitle className="text-md">Residence & Housing</CardTitle>
                      </div>
                      <Switch 
                        checked={formSettings.enabledSections.residence}
                        onCheckedChange={() => handleSectionToggle("residence")}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Current address</li>
                      <li>Length at address</li>
                      <li>Rent vs. own & monthly payment</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className={!formSettings.enabledSections.employment ? "opacity-60" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-purple-500" />
                        <CardTitle className="text-md">Employment & Income</CardTitle>
                      </div>
                      <Switch 
                        checked={formSettings.enabledSections.employment}
                        onCheckedChange={() => handleSectionToggle("employment")}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Employer, role, tenure</li>
                      <li>Gross monthly income & pay frequency</li>
                      <li>Additional income sources</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className={!formSettings.enabledSections.credit ? "opacity-60" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CircleDollarSign className="h-5 w-5 text-red-500" />
                        <CardTitle className="text-md">Credit & Financial History</CardTitle>
                      </div>
                      <Switch 
                        checked={formSettings.enabledSections.credit}
                        onCheckedChange={() => handleSectionToggle("credit")}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Bankruptcy history</li>
                      <li>Repossession/charge-offs/collections</li>
                      <li>Number of open credit lines</li>
                      <li>Total monthly debt payments</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className={!formSettings.enabledSections.vehicle ? "opacity-60" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="h-5 w-5 text-amber-500" />
                        <CardTitle className="text-md">Vehicle Preferences & Budget</CardTitle>
                      </div>
                      <Switch 
                        checked={formSettings.enabledSections.vehicle}
                        onCheckedChange={() => handleSectionToggle("vehicle")}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Desired vehicle type, make/model/year</li>
                      <li>Must-have features</li>
                      <li>Target monthly payment & down payment</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className={!formSettings.enabledSections.consent ? "opacity-60" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5 text-indigo-500" />
                        <CardTitle className="text-md">Consent & Disclosure</CardTitle>
                      </div>
                      <Switch 
                        checked={formSettings.enabledSections.consent}
                        onCheckedChange={() => handleSectionToggle("consent")}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Permission for credit pull</li>
                      <li>Agreement to privacy/data-share policy</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className={!formSettings.enabledSections.scheduling ? "opacity-60" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-cyan-500" />
                        <CardTitle className="text-md">Scheduling</CardTitle>
                      </div>
                      <Switch 
                        checked={formSettings.enabledSections.scheduling}
                        onCheckedChange={() => handleSectionToggle("scheduling")}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Best time for a follow-up call with Andrea</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="communication" className="mt-0 border-0">
              <div>
                <h3 className="text-lg font-medium mb-4">Conversation Style</h3>
                <ToggleGroup 
                  type="single" 
                  value={formSettings.communicationStyle}
                  onValueChange={(value) => {
                    if (value) handleCommunicationStyleChange(value);
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
              </div>
              
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Tone Adjustments</h3>
                
                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label htmlFor="pacing" className="text-sm font-medium">
                        Information Gathering Pace
                      </Label>
                      <span className="text-sm text-gray-500">
                        {formSettings.toneSettings.pacing}%
                      </span>
                    </div>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-2 text-xs text-gray-500">Fast (concise)</div>
                      <div className="col-span-8">
                        <Slider
                          id="pacing"
                          value={[formSettings.toneSettings.pacing]}
                          max={100}
                          step={5}
                          onValueChange={(value) => handleToneChange("pacing", value)}
                        />
                      </div>
                      <div className="col-span-2 text-xs text-gray-500 text-right">Thorough (detailed)</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label htmlFor="formality" className="text-sm font-medium">
                        Formality Level
                      </Label>
                      <span className="text-sm text-gray-500">
                        {formSettings.toneSettings.formality}%
                      </span>
                    </div>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-2 text-xs text-gray-500">Casual</div>
                      <div className="col-span-8">
                        <Slider
                          id="formality"
                          value={[formSettings.toneSettings.formality]}
                          max={100}
                          step={5}
                          onValueChange={(value) => handleToneChange("formality", value)}
                        />
                      </div>
                      <div className="col-span-2 text-xs text-gray-500 text-right">Formal</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label htmlFor="persistence" className="text-sm font-medium">
                        Follow-up Persistence
                      </Label>
                      <span className="text-sm text-gray-500">
                        {formSettings.toneSettings.persistence}%
                      </span>
                    </div>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-2 text-xs text-gray-500">Gentle</div>
                      <div className="col-span-8">
                        <Slider
                          id="persistence"
                          value={[formSettings.toneSettings.persistence]}
                          max={100}
                          step={5}
                          onValueChange={(value) => handleToneChange("persistence", value)}
                        />
                      </div>
                      <div className="col-span-2 text-xs text-gray-500 text-right">Persistent</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label htmlFor="empathy" className="text-sm font-medium">
                        Empathy Level
                      </Label>
                      <span className="text-sm text-gray-500">
                        {formSettings.toneSettings.empathy}%
                      </span>
                    </div>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-2 text-xs text-gray-500">Neutral</div>
                      <div className="col-span-8">
                        <Slider
                          id="empathy"
                          value={[formSettings.toneSettings.empathy]}
                          max={100}
                          step={5}
                          onValueChange={(value) => handleToneChange("empathy", value)}
                        />
                      </div>
                      <div className="col-span-2 text-xs text-gray-500 text-right">Empathetic</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="automation" className="mt-0 border-0">
              <div>
                <h3 className="text-lg font-medium mb-4">Automated Features</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-3 rounded-md border">
                    <Checkbox 
                      id="auto-follow-up" 
                      checked={formSettings.scriptSettings.autoFollowUp}
                      onCheckedChange={() => handleScriptToggle("autoFollowUp")}
                    />
                    <div>
                      <Label htmlFor="auto-follow-up" className="font-medium">Automated Follow-ups</Label>
                      <p className="text-sm text-gray-500">Jack will automatically follow up with customers who haven't responded after 24 hours</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 rounded-md border">
                    <Checkbox 
                      id="credit-warnings" 
                      checked={formSettings.scriptSettings.creditWarnings}
                      onCheckedChange={() => handleScriptToggle("creditWarnings")}
                    />
                    <div>
                      <Label htmlFor="credit-warnings" className="font-medium">Credit Issue Warnings</Label>
                      <p className="text-sm text-gray-500">Notify customers when potential credit issues are detected and offer repair guidance</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 rounded-md border">
                    <Checkbox 
                      id="suggest-options" 
                      checked={formSettings.scriptSettings.suggestOptions}
                      onCheckedChange={() => handleScriptToggle("suggestOptions")}
                    />
                    <div>
                      <Label htmlFor="suggest-options" className="font-medium">Vehicle Suggestions</Label>
                      <p className="text-sm text-gray-500">Provide vehicle recommendations based on customer budget and credit situation</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Custom Greeting Message</h3>
                <textarea 
                  className="w-full p-3 border rounded-md h-24"
                  value={formSettings.scriptSettings.customGreeting}
                  onChange={(e) => {
                    setFormSettings(prev => ({
                      ...prev,
                      scriptSettings: {
                        ...prev.scriptSettings,
                        customGreeting: e.target.value
                      }
                    }));
                  }}
                />
                <p className="text-sm text-gray-500 mt-2">This is the first message Jack will send when starting a conversation with a subprime lead.</p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onOpenChange(false)}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

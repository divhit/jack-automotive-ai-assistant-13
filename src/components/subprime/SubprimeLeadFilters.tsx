import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { Filter } from "lucide-react";

interface SubprimeLeadFiltersProps {
  leads: SubprimeLead[];
  chaseStatus: string;
  setChaseStatus: (value: string) => void;
  fundingReadiness: string;
  setFundingReadiness: (value: string) => void;
  sentiment: string;
  setSentiment: (value: string) => void;
  scriptProgress: string;
  setScriptProgress: (value: string) => void;
  showOverdueOnly: boolean;
  setShowOverdueOnly: (value: boolean) => void;
}

export const SubprimeLeadFilters = ({ 
  leads,
  chaseStatus,
  setChaseStatus,
  fundingReadiness,
  setFundingReadiness,
  sentiment,
  setSentiment,
  scriptProgress,
  setScriptProgress,
  showOverdueOnly,
  setShowOverdueOnly
}: SubprimeLeadFiltersProps) => {
  
  // Reset all filters
  const resetFilters = () => {
    setChaseStatus("all");
    setFundingReadiness("all");
    setSentiment("all");
    setScriptProgress("all");
    setShowOverdueOnly(false);
  };
  
  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">
            <Filter className="h-4 w-4 inline mr-1" />
            Filters
          </CardTitle>
          <button 
            className="text-xs text-muted-foreground hover:text-blue-600" 
            onClick={resetFilters}
          >
            Reset
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Chase Status</Label>
          <ToggleGroup 
            type="single" 
            variant="outline" 
            className="justify-start flex flex-wrap gap-1"
            value={chaseStatus}
            onValueChange={(value) => value && setChaseStatus(value as any)}
          >
            <ToggleGroupItem value="all" size="sm" className="text-xs h-7 px-2">All</ToggleGroupItem>
            <ToggleGroupItem value="Auto Chase Running" size="sm" className="text-xs h-7 px-2">Auto</ToggleGroupItem>
            <ToggleGroupItem value="Paused" size="sm" className="text-xs h-7 px-2">Paused</ToggleGroupItem>
            <ToggleGroupItem value="Completed" size="sm" className="text-xs h-7 px-2">Done</ToggleGroupItem>
            <ToggleGroupItem value="Manual Review" size="sm" className="text-xs h-7 px-2">Manual</ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Funding Readiness</Label>
          <ToggleGroup 
            type="single" 
            variant="outline"
            className="justify-start"
            value={fundingReadiness}
            onValueChange={(value) => value && setFundingReadiness(value as any)}
          >
            <ToggleGroupItem value="all" size="sm" className="text-xs h-7 px-2">All</ToggleGroupItem>
            <ToggleGroupItem value="Ready" size="sm" className="text-xs h-7 px-2 bg-green-50 data-[state=on]:bg-green-200 border-green-100">Ready</ToggleGroupItem>
            <ToggleGroupItem value="Partial" size="sm" className="text-xs h-7 px-2 bg-yellow-50 data-[state=on]:bg-yellow-200 border-yellow-100">Partial</ToggleGroupItem>
            <ToggleGroupItem value="Not Ready" size="sm" className="text-xs h-7 px-2 bg-red-50 data-[state=on]:bg-red-200 border-red-100">Not Ready</ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Sentiment</Label>
          <ToggleGroup 
            type="single" 
            variant="outline"
            className="justify-start flex flex-wrap gap-1"
            value={sentiment}
            onValueChange={(value) => value && setSentiment(value as any)}
          >
            <ToggleGroupItem value="all" size="sm" className="text-xs h-7 px-2">All</ToggleGroupItem>
            <ToggleGroupItem value="Warm" size="sm" className="text-xs h-7 px-2">😊</ToggleGroupItem>
            <ToggleGroupItem value="Neutral" size="sm" className="text-xs h-7 px-2">😐</ToggleGroupItem>
            <ToggleGroupItem value="Negative" size="sm" className="text-xs h-7 px-2">😕</ToggleGroupItem>
            <ToggleGroupItem value="Ghosted" size="sm" className="text-xs h-7 px-2">😴</ToggleGroupItem>
            <ToggleGroupItem value="Cold" size="sm" className="text-xs h-7 px-2">🧊</ToggleGroupItem>
            <ToggleGroupItem value="Frustrated" size="sm" className="text-xs h-7 px-2">🗯️</ToggleGroupItem>
            <ToggleGroupItem value="Needs Human" size="sm" className="text-xs h-7 px-2">🙋</ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Script Progress</Label>
          <ToggleGroup 
            type="single" 
            variant="outline"
            className="justify-start flex flex-wrap gap-1"
            value={scriptProgress}
            onValueChange={(value) => value && setScriptProgress(value as any)}
          >
            <ToggleGroupItem value="all" size="sm" className="text-xs h-7 px-2">All</ToggleGroupItem>
            <ToggleGroupItem value="contacted" size="sm" className="text-xs h-7 px-2">Contacted</ToggleGroupItem>
            <ToggleGroupItem value="screening" size="sm" className="text-xs h-7 px-2">Screening</ToggleGroupItem>
            <ToggleGroupItem value="qualification" size="sm" className="text-xs h-7 px-2">Qualified</ToggleGroupItem>
            <ToggleGroupItem value="routing" size="sm" className="text-xs h-7 px-2">Routing</ToggleGroupItem>
            <ToggleGroupItem value="submitted" size="sm" className="text-xs h-7 px-2">Submitted</ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label htmlFor="overdue-toggle" className="text-xs cursor-pointer">Show Overdue Only</Label>
            <Toggle 
              id="overdue-toggle" 
              pressed={showOverdueOnly}
              onPressedChange={setShowOverdueOnly}
              variant="outline"
              size="sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

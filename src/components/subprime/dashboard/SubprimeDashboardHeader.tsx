
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sliders } from "lucide-react";

interface SubprimeDashboardHeaderProps {
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSettingsClick: () => void;
}

export const SubprimeDashboardHeader = ({
  searchTerm,
  onSearchChange,
  onSettingsClick
}: SubprimeDashboardHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold">Subprime Dashboard</h1>
      <div className="flex items-center gap-3">
        <div className="w-64">
          <Input 
            placeholder="Search leads..." 
            value={searchTerm} 
            onChange={onSearchChange}
            className="w-full"
          />
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-9 w-9"
          onClick={onSettingsClick}
        >
          <Sliders className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};


import { Search, Filter, SortAsc } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export const SearchBar = ({ searchTerm, onSearchChange }: SearchBarProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative w-full sm:w-96">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by stock #, make, or model..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Button variant="outline" className="gap-2">
        <Filter className="h-4 w-4" />
        <span>Filter</span>
      </Button>
      <Button variant="outline" className="gap-2">
        <SortAsc className="h-4 w-4" />
        <span>Sort</span>
      </Button>
    </div>
  );
};

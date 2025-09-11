
import { Button } from "@/components/ui/button";
import { ComparableListing } from "@/data/market/marketComparableListings";
import { ListingHeader } from "./market/listings/ListingHeader";
import { ListingGrid } from "./market/listings/ListingGrid";

interface MarketListingsProps {
  listings: ComparableListing[];
  onViewFullAnalysis: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const MarketListings = ({ 
  listings, 
  onViewFullAnalysis,
  isExpanded,
  onToggleExpand,
}: MarketListingsProps) => {
  const topListings = [...listings]
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);

  return (
    <div className="py-0">
      {isExpanded && (
        <div>
          {/* Header Bar */}
          <div className="bg-blue-600 text-white px-3 py-2 font-medium">
            Closest Market Matches
          </div>

          <ListingHeader />
          <ListingGrid listings={topListings} />

          {/* Full Analysis Button */}
          <div className="flex justify-end pt-2">
            <Button 
              onClick={onViewFullAnalysis}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              View Full Vehicle Market Analysis
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

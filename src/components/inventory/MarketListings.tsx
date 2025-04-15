
import { ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComparableListing } from "@/data/market/marketComparableListings";

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

  const getMatchScoreBadgeColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 hover:bg-green-100";
    if (score >= 80) return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
  };

  return (
    <div className="py-0"> {/* Removed vertical padding completely */}
      {isExpanded && (
        <div>
          {/* Header Bar */}
          <div className="bg-blue-600 text-white px-3 py-2 font-medium">
            Closest Market Matches
          </div>

          {/* Column Headers */}
          <div className="grid grid-cols-8 gap-4 px-3 py-2 bg-muted/50 text-sm font-medium text-muted-foreground">
            <div>Model & Year</div>
            <div>Mileage</div>
            <div>Accident History</div>
            <div>Price</div>
            <div>Location</div>
            <div>Distance</div>
            <div>Match Score</div>
            <div>Source</div>
          </div>

          {/* Listings */}
          <div>
            {topListings.map((listing) => (
              <div 
                key={listing.id}
                className="grid grid-cols-8 gap-4 px-3 py-2 bg-muted/30 items-center text-sm border-b last:border-b-0"
              >
                <div>
                  <div className="font-medium">
                    {listing.year} {listing.make} {listing.model}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {listing.trim}
                  </div>
                </div>

                <div>{listing.mileage.toLocaleString()} km</div>

                <div className="flex items-center gap-1">
                  {listing.accidents} Claims
                </div>

                <div className="font-medium">
                  ${listing.price.toLocaleString()}
                </div>

                <div>{listing.location}</div>

                <div>{listing.distanceKm} km</div>

                <div className="space-y-1">
                  <Badge className={getMatchScoreBadgeColor(listing.matchScore)}>
                    {listing.matchScore}% Match
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    {listing.matchRationale}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-xs font-medium">{listing.source}</div>
                  <a 
                    href={listing.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    View Link
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

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

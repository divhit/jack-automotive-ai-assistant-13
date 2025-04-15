
import { 
  ExternalLink, 
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComparableListing } from "@/data/market/marketComparableListings";

interface MarketListingsProps {
  listings: ComparableListing[];
  onViewFullAnalysis: () => void;
}

export const MarketListings = ({ listings, onViewFullAnalysis }: MarketListingsProps) => {
  // Sort listings by match score (highest first) and take top 5
  const topListings = [...listings]
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);

  // Helper function to get badge color based on match score
  const getMatchScoreBadgeColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 hover:bg-green-100";
    if (score >= 80) return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
  };

  return (
    <div className="py-4 space-y-4">
      {/* Market Listings */}
      <div className="space-y-2">
        {topListings.map((listing) => (
          <div 
            key={listing.id}
            className="bg-muted/50 p-3 rounded-lg flex items-center justify-between gap-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {listing.year} {listing.make} {listing.model}
                </span>
                <Badge variant="outline" className="text-xs">
                  {listing.source}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {listing.trim}
              </div>
            </div>
            <div className="flex-1 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Mileage:</span>
                <span>{listing.mileage.toLocaleString()} km</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Accidents:</span>
                <span className="flex items-center">
                  {listing.accidents}
                  {listing.accidents > 0 && (
                    <AlertTriangle className="ml-1 h-3.5 w-3.5 text-amber-500" />
                  )}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <div className="font-medium">${listing.price.toLocaleString()}</div>
              <div>
                <a 
                  href={listing.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  View Listing
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <Badge className={getMatchScoreBadgeColor(listing.matchScore)}>
              {listing.matchScore}% Match
            </Badge>
          </div>
        ))}
      </div>

      {/* Full Analysis Button */}
      <div className="flex justify-end">
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
  );
};

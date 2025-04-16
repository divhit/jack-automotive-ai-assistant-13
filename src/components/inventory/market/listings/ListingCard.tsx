import { ComparableListing } from "@/data/market/types/ComparableListing";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Info } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface ListingCardProps {
  listing: ComparableListing;
  getMatchScoreBadgeColor: (score: number) => string;
}

export const ListingCard = ({ listing, getMatchScoreBadgeColor }: ListingCardProps) => {
  const getMatchDetails = (score: number) => {
    let details = [];
    
    if (Math.abs(listing.price - 32000) < 1000) details.push("Price within market average");
    if (Math.abs(listing.mileage - 45000) < 5000) details.push("Similar mileage");
    if (listing.year >= 2020) details.push("Recent model year");
    if (listing.accidents === 0) details.push("Clean history");
    
    return details.join(" • ");
  };

  return (
    <div className="grid grid-cols-8 gap-4 px-3 py-2 bg-muted/30 items-center text-sm border-b last:border-b-0">
      <div className="font-medium">
        {listing.year} {listing.make} {listing.model}
      </div>

      <div className="text-muted-foreground">
        {listing.trim}
      </div>

      <div>{listing.mileage.toLocaleString()} km</div>

      <div className="flex items-center gap-1">
        {listing.accidents} Claims
      </div>

      <div className="font-medium">
        ${listing.price.toLocaleString()}
      </div>

      <div>
        {listing.location}
      </div>

      <div className="flex items-center gap-2">
        <HoverCard>
          <HoverCardTrigger>
            <Badge className={`${getMatchScoreBadgeColor(listing.matchScore)} whitespace-nowrap cursor-help`}>
              {listing.matchScore}% Match
            </Badge>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-semibold">Match Score: {listing.matchScore}%</h4>
              <div className="space-y-1.5">
                <p className="text-sm">{getMatchDetails(listing.matchScore)}</p>
                <p className="text-xs text-muted-foreground border-t pt-2">
                  Match scores are calculated based on similarities in price, mileage, year, and vehicle condition. 
                  A score above 90% indicates an excellent market comparison.
                </p>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
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
  );
};

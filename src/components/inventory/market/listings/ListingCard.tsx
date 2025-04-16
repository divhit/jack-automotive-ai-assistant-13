
import { ComparableListing } from "@/data/market/types/ComparableListing";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Info } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface ListingCardProps {
  listing: ComparableListing;
  getMatchScoreBadgeColor: (score: number) => string;
}

export const ListingCard = ({ listing, getMatchScoreBadgeColor }: ListingCardProps) => {
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
        <Badge className={getMatchScoreBadgeColor(listing.matchScore)}>
          {listing.matchScore}% Match
        </Badge>
        <HoverCard>
          <HoverCardTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-semibold">Match Score Details</h4>
              <p className="text-sm text-muted-foreground">
                {listing.matchRationale}
              </p>
              <p className="text-xs text-muted-foreground border-t pt-2">
                Match scores indicate how well this vehicle matches your inventory item based on factors like year, mileage, trim level, and market conditions.
              </p>
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

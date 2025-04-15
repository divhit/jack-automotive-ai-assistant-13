
import { ComparableListing } from "@/data/market/marketComparableListings";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

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
  );
};

import { ComparableListing } from "@/data/market/types/ComparableListing";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

// Helper to get MDX demo images based on year/trim or explicit photo
const getListingImage = (listing: ComparableListing): string => {
  // If explicit photo field exists, use it
  if (listing.photoUrl) return listing.photoUrl;

  // Old logic fallback for other vehicles/sample MDXs
  // Case: 2022 Acura MDX
  if (
    listing.make.toLowerCase() === "acura" &&
    listing.model.toLowerCase() === "mdx" &&
    listing.year === 2022
  ) {
    return "https://mkt-vehicleimages-prd.autotradercdn.ca/photos/import/202504/1603/0734/93f86dfe-f754-4de5-89d9-e277c276011b_overlay.jpg-1024x786";
  }
  // Case: 2023 Acura MDX (S Ultra)
  if (
    listing.make.toLowerCase() === "acura" &&
    listing.model.toLowerCase() === "mdx" &&
    listing.year === 2023 &&
    listing.trim.toLowerCase().includes("ultra")
  ) {
    return "https://mkt-vehicleimages-prd.autotradercdn.ca/photos/import/202504/1607/4851/cd2213e2-5c62-4d27-965b-c0f949a7468e_overlay.jpg-1024x786";
  }
  // Case: 2019 Acura MDX
  if (
    listing.make.toLowerCase() === "acura" &&
    listing.model.toLowerCase() === "mdx" &&
    listing.year === 2019
  ) {
    return "https://mkt-vehicleimages-prd.autotradercdn.ca/photos/import/202504/1807/0648/6b6ee905-f68b-4f91-97b1-21fa3a93dac0_overlay.jpg-1024x786";
  }
  // Fallback placeholder image
  return "https://cdn.motor1.com/images/mgl/n8vEX/s1/2022-acura-mdx-type-s.jpg";
};

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
    <div className="grid grid-cols-9 gap-4 px-3 py-2 bg-muted/30 items-center text-sm border-b last:border-b-0">
      {/* Image cell */}
      <div className="flex justify-center items-center">
        <img
          src={getListingImage(listing)}
          alt={`${listing.year} ${listing.make} ${listing.model}`}
          className="w-16 h-12 object-cover rounded-md border"
          loading="lazy"
        />
      </div>

      <div className="font-medium col-span-1">
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

      {/* Match score tag and hover rationale */}
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
                  <span className="font-semibold">How this is calculated:</span> Each listing is scored based on price similarity to market average, mileage, model year, and accident history. <br />
                  A higher score means this vehicle is a stronger comparison for your inventory. <br />
                  Match rationale: <span className="italic">{listing.matchRationale}</span>
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

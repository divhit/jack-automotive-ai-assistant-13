
import { ListingCard } from "./ListingCard";
import { ComparableListing } from "@/data/market/marketComparableListings";
import { Badge } from "@/components/ui/badge";

interface ListingGridProps {
  listings: ComparableListing[];
}

export const ListingGrid = ({ listings }: ListingGridProps) => {
  const getMatchScoreBadgeColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 hover:bg-green-100";
    if (score >= 80) return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
  };

  return (
    <div>
      {listings.map((listing) => (
        <ListingCard 
          key={listing.id} 
          listing={listing} 
          getMatchScoreBadgeColor={getMatchScoreBadgeColor}
        />
      ))}
    </div>
  );
};

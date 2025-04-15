
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ExternalLink, 
  AlertTriangle,
  ArrowUpRight
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ComparableListing } from "@/data/market/marketComparableListings";

interface MarketListingsProps {
  listings: ComparableListing[];
  onViewFullAnalysis: () => void;
}

export const MarketListings = ({ listings, onViewFullAnalysis }: MarketListingsProps) => {
  // Sort listings by match score (highest first)
  const sortedListings = [...listings].sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);

  // Calculate average price
  const averagePrice = sortedListings.reduce((sum, listing) => sum + listing.price, 0) / sortedListings.length;

  // Helper function to get badge color based on match score
  const getMatchScoreBadgeColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 hover:bg-green-100";
    if (score >= 80) return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 flex flex-row justify-between items-center">
        <CardTitle className="text-lg font-semibold">
          Closest Online Listings
        </CardTitle>
        <Button 
          onClick={onViewFullAnalysis}
          variant="outline" 
          className="text-sm gap-2"
        >
          <ArrowUpRight className="h-4 w-4" />
          View Full Vehicle Analysis
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 px-4 py-3 bg-muted rounded-md flex justify-between items-center">
          <div>
            <span className="text-sm text-muted-foreground">Average Market Price:</span>
            <span className="ml-2 font-medium">${averagePrice.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Listings Found:</span>
            <span className="ml-2 font-medium">{listings.length}</span>
          </div>
        </div>
        
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {sortedListings.map((listing) => (
              <div key={listing.id} className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 p-3 flex justify-between items-start border-b">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {listing.year} {listing.make} {listing.model}
                      <Badge variant="outline" className="ml-2">{listing.source}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {listing.trim}
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge 
                          className={getMatchScoreBadgeColor(listing.matchScore)}
                        >
                          {listing.matchScore}% Match
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Match score based on year, trim, mileage, and accident history
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Price:</span>{" "}
                      <span className="font-medium">${listing.price.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mileage:</span>{" "}
                      <span className="font-medium">{listing.mileage.toLocaleString()} km</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>{" "}
                      <span className="font-medium">{listing.location}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-muted-foreground">Accidents:</span>{" "}
                      <span className="font-medium ml-1 flex items-center">
                        {listing.accidents}
                        {listing.accidents > 0 && (
                          <AlertTriangle className="ml-1 h-3.5 w-3.5 text-amber-500" />
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Days Listed:</span>{" "}
                      <span className="font-medium">{listing.daysListed}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <a 
                      href={listing.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 hover:underline"
                    >
                      View Listing 
                      <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

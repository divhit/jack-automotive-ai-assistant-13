
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign, 
  Clock 
} from "lucide-react";

interface VehicleAnalysisProps {
  isOpen: boolean;
  onClose: () => void;
  stockNumber: string;
  vehicleInfo: {
    year: number;
    make: string;
    model: string;
    trim: string;
  };
}

export const VehicleAnalysisDialog = ({ 
  isOpen, 
  onClose, 
  stockNumber, 
  vehicleInfo 
}: VehicleAnalysisProps) => {
  // Mock data for demonstration
  const marketAnalysis = {
    totalListings: 28,
    avgPrice: 32450,
    highestPrice: 38900,
    lowestPrice: 29500,
    avgDaysOnMarket: 45,
    priceRecommendation: "Reduce price by $500 to match market average",
    marketingTip: "Highlight your lower mileage compared to similar listings"
  };

  const similarListings = [
    {
      source: "AutoTrader",
      price: 31900,
      year: 2020,
      make: "Acura",
      model: "MDX",
      trim: "Technology Package",
      mileage: 45000,
      location: "Toronto, ON",
      accidents: 0,
      daysListed: 30,
      matchScore: 95,
      url: "#"
    },
    // ... more listings would be here
  ];

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Market Analysis for {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model} {vehicleInfo.trim} 
            <span className="text-sm text-muted-foreground ml-2">Stock #{stockNumber}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Market Average Price
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${marketAnalysis.avgPrice.toLocaleString()}</div>
                <div className="flex items-center mt-2 text-sm text-green-600">
                  <TrendingUp className="mr-1 h-4 w-4" />
                  <span>2.4% above market</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Days on Market
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{marketAnalysis.avgDaysOnMarket} days</div>
                <div className="flex items-center mt-2 text-sm text-amber-600">
                  <Clock className="mr-1 h-4 w-4" />
                  <span>Higher than usual</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Similar Listings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{marketAnalysis.totalListings}</div>
                <div className="flex items-center mt-2 text-sm text-red-600">
                  <TrendingDown className="mr-1 h-4 w-4" />
                  <span>High competition</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">Price Adjustment</div>
                  <p className="text-sm text-muted-foreground">{marketAnalysis.priceRecommendation}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <div className="font-medium">Marketing Suggestion</div>
                  <p className="text-sm text-muted-foreground">{marketAnalysis.marketingTip}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Similar Listings Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Similar Listings</CardTitle>
            </CardHeader>
            <ScrollArea className="h-[300px]">
              <CardContent>
                <div className="space-y-4">
                  {similarListings.map((listing, index) => (
                    <div key={index} className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {listing.year} {listing.make} {listing.model}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {listing.trim}
                          </div>
                        </div>
                        <Badge 
                          className="bg-blue-100 text-blue-800 hover:bg-blue-100"
                        >
                          {listing.matchScore}% Match
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
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
                        <div>
                          <span className="text-muted-foreground">Source:</span>{" "}
                          <span className="font-medium">{listing.source}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Days Listed:</span>{" "}
                          <span className="font-medium">{listing.daysListed}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Accidents:</span>{" "}
                          <span className="font-medium">{listing.accidents}</span>
                        </div>
                      </div>
                      <a 
                        href={listing.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block mt-4 text-sm text-blue-600 hover:underline"
                      >
                        View Listing →
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
  Clock,
  Camera
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
  ];

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Market Analysis for {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model} {vehicleInfo.trim} 
            <span className="text-sm text-muted-foreground ml-2">Stock #{stockNumber}</span>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-1">
          <div className="space-y-6 pb-6">
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

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Market Insights & Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium">Pricing Position</div>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">Insight:</span> Your price is $1,500 above market average for similar vehicles
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Takeaway:</span> {marketAnalysis.priceRecommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium">Market Position</div>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">Insight:</span> Your vehicle has 15,000 fewer miles than market average
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Takeaway:</span> {marketAnalysis.marketingTip}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <div className="font-medium">Time on Market</div>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">Insight:</span> Average days to sell is {marketAnalysis.avgDaysOnMarket} days
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Takeaway:</span> Consider price adjustment if no interest within 30 days
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Similar Listings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {similarListings.map((listing, index) => (
                    <div key={index} className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="w-full md:w-48 h-32 bg-muted rounded-lg flex items-center justify-center">
                          {listing.imageUrl ? (
                            <img 
                              src={listing.imageUrl} 
                              alt={`${listing.year} ${listing.make} ${listing.model}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Camera className="h-8 w-8 text-muted-foreground/50" />
                          )}
                        </div>

                        <div className="flex-1">
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
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

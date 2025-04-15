
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarketListings } from "@/components/inventory/MarketListings";
import { MarketSummaryCards } from "@/components/inventory/market/MarketSummaryCards";
import { MarketInsights } from "@/components/inventory/market/MarketInsights";
import { marketComparableListings } from "@/data/market/marketComparableListings";

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

  const similarListings = marketComparableListings[stockNumber] || [
    {
      id: "placeholder",
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
      url: "#",
      distanceKm: 15,
      matchRationale: "Similar year, model, and features"
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
        
        <ScrollArea className="flex-1 pr-4" style={{ height: "calc(90vh - 120px)" }}>
          <div className="space-y-6 pb-6">
            <MarketSummaryCards marketAnalysis={marketAnalysis} />
            <MarketInsights marketAnalysis={marketAnalysis} />
            <MarketListings 
              listings={similarListings} 
              onViewFullAnalysis={() => {}} 
              isExpanded={true}
              onToggleExpand={() => {}}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

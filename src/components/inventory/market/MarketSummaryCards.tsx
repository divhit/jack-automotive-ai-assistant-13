
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";

interface MarketSummaryCardsProps {
  marketAnalysis: {
    totalListings: number;
    avgPrice: number;
    avgDaysOnMarket: number;
  };
}

export const MarketSummaryCards = ({ marketAnalysis }: MarketSummaryCardsProps) => {
  return (
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
  );
};

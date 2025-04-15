
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Clock } from "lucide-react";

interface MarketInsightsProps {
  marketAnalysis: {
    priceRecommendation: string;
    marketingTip: string;
    avgDaysOnMarket: number;
  };
}

export const MarketInsights = ({ marketAnalysis }: MarketInsightsProps) => {
  return (
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
  );
};

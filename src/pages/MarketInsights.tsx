
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { 
  BarChart3, 
  DollarSign, 
  ArrowUp, 
  ArrowDown, 
  TrendingUp, 
  Building, 
  Package 
} from "lucide-react";
import { marketInsights } from "@/data";
import { Badge } from "@/components/ui/badge";

const MarketInsights = () => {
  return (
    <div className="space-y-6">
      {/* Price Adjustment Opportunities Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-automotive-primary" />
              <span>{marketInsights[0].title}</span>
            </div>
          </CardTitle>
          <CardDescription>{marketInsights[0].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {marketInsights[0].items.map((item, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{item.vehicle}</div>
                    <div className="text-sm text-muted-foreground">Stock #{item.stockNumber}</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-muted-foreground">Current:</span>
                      <span className="font-medium">{item.currentPrice}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-muted-foreground">Recommended:</span>
                      <span className={`font-medium ${
                        parseFloat(item.recommendedPrice.replace(/[^0-9.-]+/g, "")) > 
                        parseFloat(item.currentPrice.replace(/[^0-9.-]+/g, "")) 
                          ? "text-green-600"
                          : "text-red-600"
                      }`}>
                        {item.recommendedPrice}
                        {parseFloat(item.recommendedPrice.replace(/[^0-9.-]+/g, "")) > 
                         parseFloat(item.currentPrice.replace(/[^0-9.-]+/g, "")) 
                          ? <ArrowUp className="inline ml-1 h-3.5 w-3.5" />
                          : <ArrowDown className="inline ml-1 h-3.5 w-3.5" />
                        }
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-sm">{item.reasoning}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Market Trend Analysis Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-automotive-primary" />
              <span>{marketInsights[1].title}</span>
            </div>
          </CardTitle>
          <CardDescription>{marketInsights[1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {marketInsights[1].items.map((item, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="font-medium mb-1">{item.category}</div>
                <div className="text-sm text-muted-foreground mb-2">{item.examples}</div>
                <Badge className="mb-3 bg-green-100 text-green-800 hover:bg-green-100">
                  {item.trend}
                </Badge>
                <div className="text-sm">{item.insight}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Competitor Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-automotive-primary" />
              <span>{marketInsights[2].title}</span>
            </div>
          </CardTitle>
          <CardDescription>{marketInsights[2].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {marketInsights[2].items.map((item, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="font-medium">{item.competitor}</div>
                  <div className="text-sm text-muted-foreground">{item.distance} away</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-200 p-2 rounded-md text-center">
                    <div className="text-xs text-muted-foreground">Competing Vehicles</div>
                    <div className="font-medium">{item.competitiveVehicles}</div>
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="text-sm">{item.pricingStrategy}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-automotive-primary" />
              <span>{marketInsights[3].title}</span>
            </div>
          </CardTitle>
          <CardDescription>{marketInsights[3].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {marketInsights[3].items.map((item, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="font-medium">{item.category}</div>
                  <Badge className={
                    item.recommendation === "Increase allocation" 
                      ? "bg-green-100 text-green-800 hover:bg-green-100" 
                      : item.recommendation === "Reduce allocation"
                        ? "bg-red-100 text-red-800 hover:bg-red-100"
                        : "bg-blue-100 text-blue-800 hover:bg-blue-100"
                  }>
                    {item.recommendation}
                  </Badge>
                </div>
                <div className="mt-2 text-sm">{item.reasoning}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-automotive-primary" />
                <span>Market Performance</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-60 flex items-center justify-center bg-gray-50 rounded-md border">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-2" />
                <p>Market performance chart visualization</p>
                <p className="text-xs">(Demo purposes only)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-automotive-primary" />
                <span>Inventory Age Analysis</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-60 flex items-center justify-center bg-gray-50 rounded-md border">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-2" />
                <p>Inventory age analysis visualization</p>
                <p className="text-xs">(Demo purposes only)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MarketInsights;

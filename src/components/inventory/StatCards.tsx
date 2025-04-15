
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CarFront, DollarSign, AlertCircle, Loader2 } from "lucide-react";
import { InventoryItem } from "@/data/inventory/inventoryItems";

interface StatCardsProps {
  inventoryItems: InventoryItem[];
}

export const StatCards = ({ inventoryItems }: StatCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{inventoryItems.length}</div>
            <div className="bg-blue-100 p-2 rounded-full">
              <CarFront className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Inventory Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">
              ${inventoryItems.reduce((sum, item) => sum + item.currentPrice, 0).toLocaleString()}
            </div>
            <div className="bg-green-100 p-2 rounded-full">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Price Adjustment Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">
              {inventoryItems.filter(item => Math.abs(item.currentPrice - item.aiRecommendedPrice) > 500).length}
            </div>
            <div className="bg-amber-100 p-2 rounded-full">
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Average Days in Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">
              {Math.round(inventoryItems.reduce((sum, item) => sum + item.daysInInventory, 0) / inventoryItems.length)}
            </div>
            <div className="bg-purple-100 p-2 rounded-full">
              <Loader2 className="h-4 w-4 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  SortAsc, 
  CarFront, 
  DollarSign,
  AlertCircle, 
  ArrowDown,
  ArrowUp,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { inventoryItems } from "@/data";
import { marketComparableListings } from "@/data/market/marketComparableListings";
import { MarketListings } from "@/components/inventory/MarketListings";
import { VehicleAnalysisDialog } from "@/components/inventory/VehicleAnalysisDialog";

const InventoryDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState("stockNumber");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);

  const filteredInventory = inventoryItems.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.stockNumber.toLowerCase().includes(searchLower) ||
      item.make.toLowerCase().includes(searchLower) ||
      item.model.toLowerCase().includes(searchLower) ||
      `${item.year}`.includes(searchTerm)
    );
  });

  const sortedInventory = [...filteredInventory].sort((a, b) => {
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;
    
    switch (sortColumn) {
      case "stockNumber":
        return directionMultiplier * a.stockNumber.localeCompare(b.stockNumber);
      case "vehicle":
        const aVehicle = `${a.year} ${a.make} ${a.model}`;
        const bVehicle = `${b.year} ${b.make} ${b.model}`;
        return directionMultiplier * aVehicle.localeCompare(bVehicle);
      case "mileage":
        return directionMultiplier * (a.mileage - b.mileage);
      case "currentPrice":
        return directionMultiplier * (a.currentPrice - b.currentPrice);
      case "aiRecommendedPrice":
        return directionMultiplier * (a.aiRecommendedPrice - b.aiRecommendedPrice);
      case "daysInInventory":
        return directionMultiplier * (a.daysInInventory - b.daysInInventory);
      default:
        return 0;
    }
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getPriceDifferenceStyle = (current: number, recommended: number) => {
    const difference = recommended - current;
    if (Math.abs(difference) < 500) return "text-gray-500";
    return difference > 0 ? "text-green-600" : "text-red-600";
  };

  const getDaysInInventoryBadgeColor = (days: number) => {
    if (days <= 15) return "bg-green-100 text-green-800 hover:bg-green-100";
    if (days <= 30) return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    return "bg-red-100 text-red-800 hover:bg-red-100";
  };

  const handleVehicleClick = (stockNumber: string) => {
    setSelectedVehicle(stockNumber);
  };

  const getSelectedVehicleInfo = () => {
    if (!selectedVehicle) return null;
    return inventoryItems.find((item) => item.stockNumber === selectedVehicle);
  };

  const getMarketListings = () => {
    if (!selectedVehicle) return [];
    return marketComparableListings[selectedVehicle] || [];
  };

  return (
    <div className="space-y-6">
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

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by stock #, make, or model..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          <span>Filter</span>
        </Button>
        <Button variant="outline" className="gap-2">
          <SortAsc className="h-4 w-4" />
          <span>Sort</span>
        </Button>
      </div>

      {selectedVehicle && (
        <div className="mt-6">
          <MarketListings 
            listings={getMarketListings()} 
            onViewFullAnalysis={() => setShowFullAnalysis(true)}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <div className="flex items-center space-x-2">
              <CarFront className="h-5 w-5 text-automotive-primary" />
              <span>Inventory with Market Insights</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort("stockNumber")}
                >
                  <div className="flex items-center">
                    Stock #
                    {sortColumn === "stockNumber" && (
                      sortDirection === "asc" ? 
                        <ArrowUp className="ml-1 h-4 w-4" /> : 
                        <ArrowDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort("vehicle")}
                >
                  <div className="flex items-center">
                    Vehicle
                    {sortColumn === "vehicle" && (
                      sortDirection === "asc" ? 
                        <ArrowUp className="ml-1 h-4 w-4" /> : 
                        <ArrowDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort("mileage")}
                >
                  <div className="flex items-center">
                    Mileage
                    {sortColumn === "mileage" && (
                      sortDirection === "asc" ? 
                        <ArrowUp className="ml-1 h-4 w-4" /> : 
                        <ArrowDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort("currentPrice")}
                >
                  <div className="flex items-center">
                    Current Price
                    {sortColumn === "currentPrice" && (
                      sortDirection === "asc" ? 
                        <ArrowUp className="ml-1 h-4 w-4" /> : 
                        <ArrowDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort("aiRecommendedPrice")}
                >
                  <div className="flex items-center">
                    AI Recommended
                    {sortColumn === "aiRecommendedPrice" && (
                      sortDirection === "asc" ? 
                        <ArrowUp className="ml-1 h-4 w-4" /> : 
                        <ArrowDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort("daysInInventory")}
                >
                  <div className="flex items-center">
                    Days
                    {sortColumn === "daysInInventory" && (
                      sortDirection === "asc" ? 
                        <ArrowUp className="ml-1 h-4 w-4" /> : 
                        <ArrowDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Market Insights</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInventory.map((item) => (
                <React.Fragment key={item.id}>
                  <TableRow 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleVehicleClick(item.stockNumber)}
                    data-state={selectedVehicle === item.stockNumber ? "selected" : ""}
                  >
                    <TableCell className="font-medium">{item.stockNumber}</TableCell>
                    <TableCell>
                      {item.year} {item.make} {item.model}
                      <div className="text-xs text-muted-foreground">{item.trim}</div>
                    </TableCell>
                    <TableCell>{item.mileage.toLocaleString()}</TableCell>
                    <TableCell>${item.currentPrice.toLocaleString()}</TableCell>
                    <TableCell className={getPriceDifferenceStyle(item.currentPrice, item.aiRecommendedPrice)}>
                      ${item.aiRecommendedPrice.toLocaleString()}
                      {Math.abs(item.aiRecommendedPrice - item.currentPrice) > 500 && (
                        <div className="text-xs">
                          {item.aiRecommendedPrice > item.currentPrice ? "↑" : "↓"} 
                          ${Math.abs(item.aiRecommendedPrice - item.currentPrice).toLocaleString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getDaysInInventoryBadgeColor(item.daysInInventory)}>
                        {item.daysInInventory}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="text-sm text-muted-foreground">{item.marketInsights}</div>
                    </TableCell>
                  </TableRow>
                  {selectedVehicle === item.stockNumber && (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <div className="border-t">
                          <MarketListings 
                            listings={getMarketListings()} 
                            onViewFullAnalysis={() => setShowFullAnalysis(true)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedVehicle && getSelectedVehicleInfo() && (
        <VehicleAnalysisDialog
          isOpen={showFullAnalysis}
          onClose={() => setShowFullAnalysis(false)}
          stockNumber={selectedVehicle}
          vehicleInfo={{
            year: getSelectedVehicleInfo()!.year,
            make: getSelectedVehicleInfo()!.make,
            model: getSelectedVehicleInfo()!.model,
            trim: getSelectedVehicleInfo()!.trim,
          }}
        />
      )}
    </div>
  );
};

export default InventoryDashboard;

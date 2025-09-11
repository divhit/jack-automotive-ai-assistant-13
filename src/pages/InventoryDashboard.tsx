
import React, { useState } from "react";
import { inventoryItems } from "@/data/inventory/inventoryItems";
import { marketComparableListings } from "@/data/market/marketComparableListings";
import { VehicleAnalysisDialog } from "@/components/inventory/VehicleAnalysisDialog";
import { StatCards } from "@/components/inventory/StatCards";
import { SearchBar } from "@/components/inventory/SearchBar";
import { InventoryTable } from "@/components/inventory/InventoryTable";

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

  const handleVehicleClick = (stockNumber: string) => {
    setSelectedVehicle(stockNumber);
  };

  const getSelectedVehicleInfo = () => {
    if (!selectedVehicle) return null;
    return inventoryItems.find((item) => item.stockNumber === selectedVehicle);
  };

  const getMarketListings = (stockNumber: string) => {
    return marketComparableListings[stockNumber] || [];
  };

  return (
    <div className="space-y-6">
      <StatCards inventoryItems={inventoryItems} />
      <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      <InventoryTable
        items={sortedInventory}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        selectedVehicle={selectedVehicle}
        onVehicleSelect={handleVehicleClick}
        getMarketListings={getMarketListings}
        onViewFullAnalysis={() => setShowFullAnalysis(true)}
      />
      
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

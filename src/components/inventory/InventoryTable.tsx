
import React from 'react';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody,
} from "@/components/ui/table";
import { ArrowUp, ArrowDown, CarFront } from "lucide-react";
import { InventoryTableRow } from "./InventoryTableRow";
import { InventoryItem } from "@/data/inventory/inventoryItems";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InventoryTableProps {
  items: InventoryItem[];
  sortColumn: string;
  sortDirection: "asc" | "desc";
  onSort: (column: string) => void;
  selectedVehicle: string | null;
  onVehicleSelect: (stockNumber: string) => void;
  getMarketListings: (stockNumber: string) => any[];
  onViewFullAnalysis: () => void;
}

export const InventoryTable = ({
  items,
  sortColumn,
  sortDirection,
  onSort,
  selectedVehicle,
  onVehicleSelect,
  getMarketListings,
  onViewFullAnalysis
}: InventoryTableProps) => {
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

  return (
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
                onClick={() => onSort("stockNumber")}
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
                onClick={() => onSort("vehicle")}
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
                onClick={() => onSort("mileage")}
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
                onClick={() => onSort("currentPrice")}
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
                onClick={() => onSort("aiRecommendedPrice")}
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
                onClick={() => onSort("daysInInventory")}
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
            {items.map((item) => (
              <InventoryTableRow
                key={item.id}
                item={item}
                isSelected={selectedVehicle === item.stockNumber}
                onSelect={onVehicleSelect}
                marketListings={getMarketListings(item.stockNumber)}
                onViewFullAnalysis={onViewFullAnalysis}
                getPriceDifferenceStyle={getPriceDifferenceStyle}
                getDaysInInventoryBadgeColor={getDaysInInventoryBadgeColor}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};


import React, { useState } from 'react';
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InventoryItem } from "@/data/inventory/inventoryItems";
import { MarketListings } from "./MarketListings";

interface InventoryTableRowProps {
  item: InventoryItem;
  isSelected: boolean;
  onSelect: (stockNumber: string) => void;
  marketListings: any[];
  onViewFullAnalysis: () => void;
  getPriceDifferenceStyle: (current: number, recommended: number) => string;
  getDaysInInventoryBadgeColor: (days: number) => string;
}

export const InventoryTableRow = ({
  item,
  isSelected,
  onSelect,
  marketListings,
  onViewFullAnalysis,
  getPriceDifferenceStyle,
  getDaysInInventoryBadgeColor
}: InventoryTableRowProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRowClick = () => {
    if (!isSelected) {
      onSelect(item.stockNumber);
      setIsExpanded(true);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <React.Fragment>
      <TableRow 
        className="cursor-pointer hover:bg-muted/50"
        onClick={handleRowClick}
        data-state={isSelected ? "selected" : ""}
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
      {isSelected && (
        <TableRow>
          <TableCell colSpan={7} className="p-0">
            <div className="border-t">
              <MarketListings 
                listings={marketListings} 
                onViewFullAnalysis={onViewFullAnalysis}
                isExpanded={isExpanded}
                onToggleExpand={() => setIsExpanded(!isExpanded)}
              />
            </div>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
};

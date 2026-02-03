
import { Card, CardContent } from "@/components/ui/card";
import { CarFront, DollarSign, AlertCircle, Clock } from "lucide-react";
import { InventoryItem } from "@/data/inventory/inventoryItems";

interface StatCardsProps {
  inventoryItems: InventoryItem[];
}

const stats = (items: InventoryItem[]) => [
  {
    label: "Total Inventory",
    value: items.length,
    icon: CarFront,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Inventory Value",
    value: `$${items.reduce((sum, item) => sum + item.currentPrice, 0).toLocaleString()}`,
    icon: DollarSign,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "Price Adjustments",
    value: items.filter(item => Math.abs(item.currentPrice - item.aiRecommendedPrice) > 500).length,
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    label: "Avg Days in Stock",
    value: Math.round(items.reduce((sum, item) => sum + item.daysInInventory, 0) / items.length),
    icon: Clock,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
];

export const StatCards = ({ inventoryItems }: StatCardsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats(inventoryItems).map((stat) => (
        <Card key={stat.label} className="stat-card shadow-card hover:shadow-card-hover border border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </span>
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

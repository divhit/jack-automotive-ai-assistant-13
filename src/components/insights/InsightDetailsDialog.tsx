
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InsightDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any;
}

export const InsightDetailsDialog = ({
  isOpen,
  onClose,
  title,
  data
}: InsightDetailsProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full">
          <div className="space-y-4">
            {data.items?.map((item: any, index: number) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="font-medium mb-2">{item.category || item.vehicle || item.competitor}</div>
                  <p className="text-muted-foreground">{item.insight || item.reasoning || item.pricingStrategy}</p>
                  {item.trend && (
                    <div className="mt-2">
                      <span className="text-sm font-medium">Trend: </span>
                      <span className="text-sm text-muted-foreground">{item.trend}</span>
                    </div>
                  )}
                  {item.examples && (
                    <div className="mt-2">
                      <span className="text-sm font-medium">Examples: </span>
                      <span className="text-sm text-muted-foreground">{item.examples}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

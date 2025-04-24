
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Info } from "lucide-react";

export const ChatHeader = () => {
  return (
    <CardHeader className="pb-4">
      <CardTitle className="text-xl">
        <div className="flex items-center space-x-2">
          <Car className="h-5 w-5 text-automotive-primary" />
          <span>Chat with Jack</span>
        </div>
      </CardTitle>
      <div className="text-sm text-muted-foreground flex items-center mt-1">
        <Info className="h-3.5 w-3.5 mr-1.5" />
        <span>Ask Jack any questions about inventory, pricing, or market conditions</span>
      </div>
    </CardHeader>
  );
};

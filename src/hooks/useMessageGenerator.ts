
import { jackResponses } from "@/data";

export const useMessageGenerator = () => {
  const generateResponse = (query: string): string => {
    if (query.toLowerCase().includes("optimal price") || query.toLowerCase().includes("pricing")) {
      const stockNumberMatch = query.match(/#([A-Za-z0-9]+)/);
      if (stockNumberMatch) {
        return jackResponses.getPricingRecommendation(stockNumberMatch[1]);
      }
    }

    if (query.toLowerCase().includes("compare") || query.toLowerCase().includes("similar")) {
      const yearMakeModelMatch = query.match(/(\d{4})\s+([A-Za-z-]+)\s+([A-Za-z0-9]+)/);
      if (yearMakeModelMatch) {
        return jackResponses.getMarketComparison(yearMakeModelMatch[0]);
      }
    }

    if (query.toLowerCase().includes("trend") || query.toLowerCase().includes("trending")) {
      return jackResponses.getTrendingVehicles();
    }

    if (query.toLowerCase().includes("details")) {
      const stockNumberMatch = query.match(/#([A-Za-z0-9]+)/);
      if (stockNumberMatch) {
        return jackResponses.getVehicleDetails(stockNumberMatch[1]);
      }
    }

    if (query.toLowerCase().includes("pricing opportunit") || query.toLowerCase().includes("price adjustment")) {
      return jackResponses.getPricingOpportunities();
    }

    return jackResponses.getGenericResponse(query);
  };

  return { generateResponse };
};

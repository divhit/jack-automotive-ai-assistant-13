
import { jackResponses } from "@/data";

export interface CommunicationStyle {
  formality: number; // 0-100: casual to formal
  pacing: number; // 0-100: concise to detailed
  empathy: number; // 0-100: neutral to empathetic
  persistence: number; // 0-100: gentle to persistent
  tone: "professional" | "balanced" | "conversational";
}

export const DEFAULT_COMMUNICATION_STYLE: CommunicationStyle = {
  formality: 60,
  pacing: 50, 
  empathy: 75,
  persistence: 45,
  tone: "balanced"
};

export const useMessageGenerator = () => {
  // This function adjusts responses based on communication style settings
  const applyStyleToResponse = (response: string, style: CommunicationStyle = DEFAULT_COMMUNICATION_STYLE): string => {
    let styledResponse = response;
    
    // Apply tone adjustments
    if (style.tone === "professional") {
      styledResponse = styledResponse
        .replace(/Hey there!/g, "Hello,")
        .replace(/Thanks/g, "Thank you")
        .replace(/sure thing/gi, "certainly")
        .replace(/no problem/gi, "of course");
    } else if (style.tone === "conversational") {
      styledResponse = styledResponse
        .replace(/Hello,/g, "Hey there!")
        .replace(/Thank you/g, "Thanks")
        .replace(/I would recommend/g, "I'd recommend");
    }
    
    // Apply formality adjustments based on slider value
    if (style.formality > 75) {
      styledResponse = styledResponse
        .replace(/can't/g, "cannot")
        .replace(/don't/g, "do not")
        .replace(/Let's/g, "Let us");
    } else if (style.formality < 40) {
      styledResponse = styledResponse
        .replace(/I will/g, "I'll")
        .replace(/you will/g, "you'll");
    }
    
    // Apply empathy adjustments
    if (style.empathy > 65) {
      if (!styledResponse.includes("understand") && !styledResponse.includes("appreciate")) {
        styledResponse = styledResponse.replace(/\. /g, ". I understand this process can be complex. ");
      }
    }
    
    // Apply persistence adjustments
    if (style.persistence > 70) {
      if (!styledResponse.includes("important") && !styledResponse.includes("crucial")) {
        styledResponse += " It's really important that we get this information to help secure the best financing options for you. Could you please provide those details when you have a moment?";
      }
    }
    
    return styledResponse;
  };

  const generateResponse = (query: string, communicationStyle?: CommunicationStyle): string => {
    let response = "";
    
    if (query.toLowerCase().includes("optimal price") || query.toLowerCase().includes("pricing")) {
      const stockNumberMatch = query.match(/#([A-Za-z0-9]+)/);
      if (stockNumberMatch) {
        response = jackResponses.getPricingRecommendation(stockNumberMatch[1]);
      }
    } else if (query.toLowerCase().includes("compare") || query.toLowerCase().includes("similar")) {
      const yearMakeModelMatch = query.match(/(\d{4})\s+([A-Za-z-]+)\s+([A-Za-z0-9]+)/);
      if (yearMakeModelMatch) {
        response = jackResponses.getMarketComparison(yearMakeModelMatch[0]);
      }
    } else if (query.toLowerCase().includes("trend") || query.toLowerCase().includes("trending")) {
      response = jackResponses.getTrendingVehicles();
    } else if (query.toLowerCase().includes("details")) {
      const stockNumberMatch = query.match(/#([A-Za-z0-9]+)/);
      if (stockNumberMatch) {
        response = jackResponses.getVehicleDetails(stockNumberMatch[1]);
      }
    } else if (query.toLowerCase().includes("pricing opportunit") || query.toLowerCase().includes("price adjustment")) {
      response = jackResponses.getPricingOpportunities();
    } else {
      response = jackResponses.getGenericResponse(query);
    }
    
    // Apply communication style if provided, otherwise use default
    return applyStyleToResponse(response, communicationStyle);
  };

  return { generateResponse };
};

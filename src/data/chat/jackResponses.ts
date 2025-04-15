import { inventoryItems } from "../inventory/inventoryItems";

// Sample dummy responses for Jack AI
export const jackResponses = {
  getPricingRecommendation: (stockNumber: string) => {
    const vehicle = inventoryItems.find(item => item.stockNumber === stockNumber);
    if (!vehicle) {
      return `I couldn't find a vehicle with stock number ${stockNumber} in the inventory. Please check the stock number and try again.`;
    }
    
    return `Based on current market data from AutoTrader and Facebook Marketplace, I recommend pricing the ${vehicle.year} ${vehicle.make} ${vehicle.model} (stock #${vehicle.stockNumber}) at $${vehicle.aiRecommendedPrice.toLocaleString()}. ${vehicle.marketInsights}. Your current price of $${vehicle.currentPrice.toLocaleString()} is ${vehicle.aiRecommendedPrice < vehicle.currentPrice ? 'above' : 'below'} optimal market positioning.`;
  },
  
  getMarketComparison: (makeModel: string) => {
    const vehicleParts = makeModel.split(' ');
    const year = vehicleParts[0];
    const make = vehicleParts[1];
    const model = vehicleParts.slice(2).join(' ');
    
    const matchedVehicles = inventoryItems.filter(item => 
      item.year.toString() === year && 
      item.make.toLowerCase() === make.toLowerCase() &&
      item.model.toLowerCase().includes(model.toLowerCase())
    );
    
    if (matchedVehicles.length === 0) {
      return `I couldn't find any ${year} ${make} ${model} vehicles in our inventory. Would you like information about similar vehicles?`;
    }
    
    const vehicle = matchedVehicles[0];
    
    return `Your ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim} with ${vehicle.mileage.toLocaleString()} miles is priced at $${vehicle.currentPrice.toLocaleString()}. Based on market analysis of similar vehicles:\n\n- Average market price: $${(vehicle.aiRecommendedPrice).toLocaleString()}\n- Days on market (average): 22 days\n- Your current days in inventory: ${vehicle.daysInInventory} days\n\n${vehicle.marketInsights}\n\nRecommendation: ${vehicle.aiRecommendedPrice > vehicle.currentPrice ? 'Consider increasing' : 'Consider reducing'} price to $${vehicle.aiRecommendedPrice.toLocaleString()} to optimize for market conditions.`;
  },
  
  getTrendingVehicles: () => {
    return `Based on the last 30 days of market data, these vehicle categories are trending in your area:

1. Compact SUVs (Honda CR-V, Toyota RAV4) - 32% increase in search volume
2. Luxury Sedans (BMW 3 Series, Audi A4) - 18% increase in inquiries  
3. Electric Vehicles (Tesla Model 3, Ford Mustang Mach-E) - 27% increase in test drives

Your Honda CR-V and Toyota RAV4 inventory is well-positioned to capitalize on current demand. Consider featuring these prominently in your marketing.`;
  },
  
  getVehicleDetails: (stockNumber: string) => {
    const vehicle = inventoryItems.find(item => item.stockNumber === stockNumber);
    if (!vehicle) {
      return `I couldn't find a vehicle with stock number ${stockNumber} in the inventory. Please check the stock number and try again.`;
    }
    
    return `Your ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim} (stock #${vehicle.stockNumber}) has ${vehicle.mileage.toLocaleString()} miles and is currently listed at $${vehicle.currentPrice.toLocaleString()}. It features ${vehicle.exteriorColor} exterior with ${vehicle.interiorColor} interior.

Market position: You're priced ${vehicle.currentPrice > vehicle.aiRecommendedPrice ? 'above' : 'below'} similar models by about $${Math.abs(vehicle.currentPrice - vehicle.aiRecommendedPrice).toLocaleString()}. Current average days-to-turn for this model is 22 days, and yours has been in inventory for ${vehicle.daysInInventory} days.

Recommendation: ${vehicle.aiRecommendedPrice > vehicle.currentPrice ? 'Consider increasing price to $' + vehicle.aiRecommendedPrice.toLocaleString() : vehicle.aiRecommendedPrice < vehicle.currentPrice ? 'Consider reducing price to $' + vehicle.aiRecommendedPrice.toLocaleString() : 'Hold current pricing'}. ${vehicle.marketInsights}.`;
  },
  
  getPricingOpportunities: () => {
    const opportunities = inventoryItems.filter(item => Math.abs(item.currentPrice - item.aiRecommendedPrice) > 500);
    
    if (opportunities.length === 0) {
      return "I've analyzed your current inventory pricing and found that all vehicles are already optimally priced within market expectations. Continue to monitor market conditions for any shifts.";
    }
    
    const topOpportunities = opportunities.slice(0, 3);
    
    let response = `I've identified ${opportunities.length} pricing opportunities. Here are the top ${topOpportunities.length}:\n\n`;
    
    topOpportunities.forEach((vehicle, index) => {
      const priceDiff = vehicle.aiRecommendedPrice - vehicle.currentPrice;
      response += `${index + 1}. ${vehicle.year} ${vehicle.make} ${vehicle.model} (stock #${vehicle.stockNumber}): Currently $${vehicle.currentPrice.toLocaleString()}, recommend ${priceDiff > 0 ? 'increasing' : 'reducing'} to $${vehicle.aiRecommendedPrice.toLocaleString()} ${priceDiff > 0 ? '(+$' + priceDiff.toLocaleString() + ')' : '(-$' + Math.abs(priceDiff).toLocaleString() + ')'}\n\n`;
    });
    
    const totalImpact = topOpportunities.reduce((sum, vehicle) => sum + (vehicle.aiRecommendedPrice - vehicle.currentPrice), 0);
    
    response += `Estimated net impact: ${totalImpact >= 0 ? '+' : ''}$${totalImpact.toLocaleString()}. Expected benefit: ${totalImpact >= 0 ? 'Increased revenue while maintaining competitive position' : 'Reduced carrying costs and faster inventory turn'}.`;
    
    return response;
  },
  
  // Generic response for any unrecognized queries
  getGenericResponse: (query: string) => {
    return `I understand you're asking about "${query}". To provide the most accurate information, could you specify which vehicle you're interested in by stock number or make/model? Alternatively, I can help with market trends, inventory recommendations, or competitive analysis.`;
  }
};

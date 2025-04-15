// Market insights dummy data
export const marketInsights = [
  {
    id: "MI001",
    title: "Price Adjustment Opportunities",
    description: "Vehicles that could benefit from price adjustments based on market data",
    items: [
      {
        stockNumber: "BM21X5",
        vehicle: "2021 BMW X5 xDrive40i",
        currentPrice: "$62,950",
        recommendedPrice: "$61,500",
        reasoning: "Six similar models are available in the market at an average of $61,450"
      },
      {
        stockNumber: "TS20M3",
        vehicle: "2020 Tesla Model 3 Long Range",
        currentPrice: "$44,990",
        recommendedPrice: "$43,500",
        reasoning: "Market has shifted with three comparable models priced $1,490 lower on average"
      },
      {
        stockNumber: "AC22MD",
        vehicle: "2022 Acura MDX Advance Package",
        currentPrice: "$55,995",
        recommendedPrice: "$56,500",
        reasoning: "Limited availability in market, demand supports higher pricing"
      }
    ]
  },
  {
    id: "MI002",
    title: "Market Trend Analysis",
    description: "Current automotive market trends in your region",
    items: [
      {
        category: "Compact SUVs",
        examples: "Honda CR-V, Toyota RAV4",
        trend: "+32% search volume",
        insight: "Strong demand continues for fuel-efficient SUVs"
      },
      {
        category: "Luxury Sedans",
        examples: "BMW 3 Series, Audi A4",
        trend: "+18% inquiries",
        insight: "Renewed interest in luxury sedan segment"
      },
      {
        category: "Electric Vehicles",
        examples: "Tesla Model 3, Ford Mustang Mach-E",
        trend: "+27% test drives",
        insight: "EV adoption accelerating with new tax incentives"
      }
    ]
  },
  {
    id: "MI003",
    title: "Competitor Analysis",
    description: "Overview of competing dealership inventory and pricing",
    items: [
      {
        competitor: "Luxury Motors",
        distance: "3.2 miles",
        competitiveVehicles: 12,
        pricingStrategy: "Averaging 3.5% higher than market on similar inventory"
      },
      {
        competitor: "AutoNation",
        distance: "5.7 miles",
        competitiveVehicles: 8,
        pricingStrategy: "Aggressive pricing, 2.1% below market average"
      },
      {
        competitor: "Hometown Autos",
        distance: "8.3 miles",
        competitiveVehicles: 15,
        pricingStrategy: "At market pricing with higher emphasis on add-ons"
      }
    ]
  },
  {
    id: "MI004",
    title: "Inventory Recommendations",
    description: "Suggested inventory adjustments based on market data",
    items: [
      {
        category: "Hybrid SUVs",
        recommendation: "Increase allocation",
        reasoning: "Low supply (2 units) vs. high demand (23% of searches)"
      },
      {
        category: "Full-size Trucks",
        recommendation: "Maintain current levels",
        reasoning: "Balanced supply (8 units) vs. demand (12% of searches)"
      },
      {
        category: "Compact Sedans",
        recommendation: "Reduce allocation",
        reasoning: "High supply (12 units) vs. declining demand (8% of searches)"
      }
    ]
  }
];

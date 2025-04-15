export interface InventoryItem {
  id: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  mileage: number;
  currentPrice: number;
  aiRecommendedPrice: number;
  marketInsights: string;
  daysInInventory: number;
  condition: string;
  exteriorColor: string;
  interiorColor: string;
  fuelType: string;
}

export const inventoryItems = [
  {
    id: "A1234",
    stockNumber: "BM21X5",
    year: 2021,
    make: "BMW",
    model: "X5",
    trim: "xDrive40i",
    mileage: 15670,
    currentPrice: 62950,
    aiRecommendedPrice: 61500,
    marketInsights: "6 similar models available, priced $1,450 lower on average",
    daysInInventory: 23,
    condition: "Excellent",
    exteriorColor: "Alpine White",
    interiorColor: "Black",
    fuelType: "Gasoline"
  },
  {
    id: "A1235",
    stockNumber: "AC22MD",
    year: 2022,
    make: "Acura",
    model: "MDX",
    trim: "Advance Package",
    mileage: 8920,
    currentPrice: 55995,
    aiRecommendedPrice: 56500,
    marketInsights: "Limited availability, priced $500 below market average",
    daysInInventory: 15,
    condition: "Excellent",
    exteriorColor: "Majestic Black Pearl",
    interiorColor: "Espresso",
    fuelType: "Gasoline"
  },
  {
    id: "A1236",
    stockNumber: "TS20M3",
    year: 2020,
    make: "Tesla",
    model: "Model 3",
    trim: "Long Range",
    mileage: 23450,
    currentPrice: 44990,
    aiRecommendedPrice: 43500,
    marketInsights: "High demand, 3 similar models priced $1,490 lower",
    daysInInventory: 8,
    condition: "Excellent",
    exteriorColor: "Pearl White",
    interiorColor: "Black",
    fuelType: "Electric"
  },
  {
    id: "A1237",
    stockNumber: "AU19Q7",
    year: 2019,
    make: "Audi",
    model: "Q7",
    trim: "Prestige",
    mileage: 31890,
    currentPrice: 48995,
    aiRecommendedPrice: 47500,
    marketInsights: "5 similar models available, priced $1,495 lower on average",
    daysInInventory: 31,
    condition: "Good",
    exteriorColor: "Glacier White",
    interiorColor: "Nougat Brown",
    fuelType: "Gasoline"
  },
  {
    id: "A1238",
    stockNumber: "FD23F1",
    year: 2023,
    make: "Ford",
    model: "F-150",
    trim: "Lariat",
    mileage: 5670,
    currentPrice: 58990,
    aiRecommendedPrice: 59500,
    marketInsights: "High demand, priced $510 below similar models",
    daysInInventory: 12,
    condition: "Excellent",
    exteriorColor: "Antimatter Blue",
    interiorColor: "Black",
    fuelType: "Gasoline"
  },
  {
    id: "A1239",
    stockNumber: "HO22CR",
    year: 2022,
    make: "Honda",
    model: "CR-V",
    trim: "Touring",
    mileage: 11230,
    currentPrice: 37995,
    aiRecommendedPrice: 38500,
    marketInsights: "Popular model, competitively priced",
    daysInInventory: 18,
    condition: "Excellent",
    exteriorColor: "Crystal Black Pearl",
    interiorColor: "Black",
    fuelType: "Gasoline"
  },
  {
    id: "A1240",
    stockNumber: "ME21GL",
    year: 2021,
    make: "Mercedes-Benz",
    model: "GLE",
    trim: "450 4MATIC",
    mileage: 19870,
    currentPrice: 65990,
    aiRecommendedPrice: 64500,
    marketInsights: "4 similar models available, priced $1,490 lower on average",
    daysInInventory: 27,
    condition: "Excellent",
    exteriorColor: "Selenite Grey",
    interiorColor: "Black",
    fuelType: "Gasoline"
  },
  {
    id: "A1241",
    stockNumber: "TO22RA",
    year: 2022,
    make: "Toyota",
    model: "RAV4",
    trim: "Limited",
    mileage: 9870,
    currentPrice: 39995,
    aiRecommendedPrice: 39500,
    marketInsights: "High demand, appropriately priced for market",
    daysInInventory: 14,
    condition: "Excellent",
    exteriorColor: "Blueprint",
    interiorColor: "Black",
    fuelType: "Hybrid"
  }
];

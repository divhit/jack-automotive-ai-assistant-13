// Market comparable listings for inventory items
export type ComparableListing = {
  id: string;
  source: string;
  url: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  mileage: number;
  price: number;
  location: string;
  accidents: number;
  daysListed: number;
  matchScore: number;
  distanceKm: number;
  matchRationale: string;
};

// Map of stock numbers to their comparable listings
export const marketComparableListings: Record<string, ComparableListing[]> = {
  "BM21X5": [
    {
      id: "ML001",
      source: "AutoTrader",
      url: "#",
      year: 2021,
      make: "BMW",
      model: "X5",
      trim: "xDrive40i",
      mileage: 17200,
      price: 61500,
      location: "Richmond, BC",
      accidents: 0,
      daysListed: 32,
      matchScore: 97,
      distanceKm: 10,
      matchRationale: "Good condition, low mileage"
    },
    {
      id: "ML002",
      source: "Facebook Marketplace",
      url: "#",
      year: 2021,
      make: "BMW",
      model: "X5",
      trim: "xDrive40i Sport",
      mileage: 19450,
      price: 60800,
      location: "Burnaby, BC",
      accidents: 0,
      daysListed: 18,
      matchScore: 93,
      distanceKm: 15,
      matchRationale: "Good condition, low mileage"
    },
    {
      id: "ML003",
      source: "AutoTrader",
      url: "#",
      year: 2020,
      make: "BMW",
      model: "X5",
      trim: "xDrive40i",
      mileage: 24100,
      price: 58900,
      location: "Vancouver, BC",
      accidents: 0,
      daysListed: 45,
      matchScore: 88,
      distanceKm: 20,
      matchRationale: "Good condition, low mileage"
    },
    {
      id: "ML004",
      source: "Facebook Marketplace",
      url: "#",
      year: 2021,
      make: "BMW",
      model: "X5",
      trim: "M50i",
      mileage: 22300,
      price: 72500,
      location: "Kelowna, BC",
      accidents: 1,
      daysListed: 27,
      matchScore: 82,
      distanceKm: 25,
      matchRationale: "Good condition, low mileage"
    },
    {
      id: "ML005",
      source: "AutoTrader",
      url: "#",
      year: 2022,
      make: "BMW",
      model: "X5",
      trim: "xDrive40i",
      mileage: 8900,
      price: 66900,
      location: "Abbotsford, BC",
      accidents: 0,
      daysListed: 14,
      matchScore: 85,
      distanceKm: 30,
      matchRationale: "Good condition, low mileage"
    },
  ],
  "AC22MD": [
    {
      id: "ML006",
      source: "AutoTrader",
      url: "#",
      year: 2022,
      make: "Acura",
      model: "MDX",
      trim: "Advance Package",
      mileage: 10120,
      price: 56200,
      location: "Surrey, BC",
      accidents: 0,
      daysListed: 22,
      matchScore: 96,
      distanceKm: 35,
      matchRationale: "Good condition, low mileage"
    },
    {
      id: "ML007",
      source: "Facebook Marketplace",
      url: "#",
      year: 2022,
      make: "Acura",
      model: "MDX",
      trim: "A-Spec",
      mileage: 12450,
      price: 54800,
      location: "Coquitlam, BC",
      accidents: 0,
      daysListed: 31,
      matchScore: 91,
      distanceKm: 40,
      matchRationale: "Good condition, low mileage"
    },
    {
      id: "ML008",
      source: "AutoTrader",
      url: "#",
      year: 2021,
      make: "Acura",
      model: "MDX",
      trim: "Technology Package",
      mileage: 17800,
      price: 52400,
      location: "Kamloops, BC",
      accidents: 0,
      daysListed: 42,
      matchScore: 87,
      distanceKm: 45,
      matchRationale: "Good condition, low mileage"
    },
    {
      id: "ML009",
      source: "Facebook Marketplace",
      url: "#",
      year: 2022,
      make: "Acura",
      model: "MDX",
      trim: "Advance Package",
      mileage: 14200,
      price: 55100,
      location: "Nanaimo, BC",
      accidents: 1,
      daysListed: 19,
      matchScore: 89,
      distanceKm: 50,
      matchRationale: "Good condition, low mileage"
    },
    {
      id: "ML010",
      source: "AutoTrader",
      url: "#",
      year: 2023,
      make: "Acura",
      model: "MDX",
      trim: "Technology Package",
      mileage: 5300,
      price: 59700,
      location: "Prince George, BC",
      accidents: 0,
      daysListed: 8,
      matchScore: 85,
      distanceKm: 55,
      matchRationale: "Good condition, low mileage"
    },
  ],
  // Adding more sample data for other vehicles
  "TS20M3": [
    {
      id: "ML011",
      source: "AutoTrader",
      url: "#",
      year: 2020,
      make: "Tesla",
      model: "Model 3",
      trim: "Long Range",
      mileage: 25800,
      price: 43200,
      location: "Vancouver, BC",
      accidents: 0,
      daysListed: 25,
      matchScore: 95,
      distanceKm: 60,
      matchRationale: "Good condition, low mileage"
    },
    // More listings would be here
  ],
  "AU19Q7": [
    {
      id: "ML016",
      source: "AutoTrader",
      url: "#",
      year: 2019,
      make: "Audi",
      model: "Q7",
      trim: "Prestige",
      mileage: 33400,
      price: 46800,
      location: "Vancouver, BC",
      accidents: 0,
      daysListed: 37,
      matchScore: 94,
      distanceKm: 65,
      matchRationale: "Good condition, low mileage"
    },
    // More listings would be here
  ],
  "FD23F1": [
    {
      id: "ML021",
      source: "AutoTrader",
      url: "#",
      year: 2023,
      make: "Ford",
      model: "F-150",
      trim: "Lariat",
      mileage: 6500,
      price: 59200,
      location: "Vancouver, BC",
      accidents: 0,
      daysListed: 16,
      matchScore: 96,
      distanceKm: 70,
      matchRationale: "Good condition, low mileage"
    },
    // More listings would be here
  ],
  "HO22CR": [
    {
      id: "ML026",
      source: "AutoTrader",
      url: "#",
      year: 2022,
      make: "Honda",
      model: "CR-V",
      trim: "Touring",
      mileage: 12800,
      price: 38200,
      location: "Vancouver, BC",
      accidents: 0,
      daysListed: 23,
      matchScore: 93,
      distanceKm: 75,
      matchRationale: "Good condition, low mileage"
    },
    // More listings would be here
  ],
  "ME21GL": [
    {
      id: "ML031",
      source: "AutoTrader",
      url: "#",
      year: 2021,
      make: "Mercedes-Benz",
      model: "GLE",
      trim: "450 4MATIC",
      mileage: 20500,
      price: 64100,
      location: "Vancouver, BC",
      accidents: 0,
      daysListed: 29,
      matchScore: 92,
      distanceKm: 80,
      matchRationale: "Good condition, low mileage"
    },
    // More listings would be here
  ],
  "TO22RA": [
    {
      id: "ML036",
      source: "AutoTrader",
      url: "#",
      year: 2022,
      make: "Toyota",
      model: "RAV4",
      trim: "Limited",
      mileage: 10500,
      price: 39700,
      location: "Vancouver, BC",
      accidents: 0,
      daysListed: 19,
      matchScore: 94,
      distanceKm: 85,
      matchRationale: "Good condition, low mileage"
    },
    // More listings would be here
  ]
};

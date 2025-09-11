import { ComparableListing } from "../types/ComparableListing";

export const electricVehicleListings: Record<string, ComparableListing[]> = {
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
};

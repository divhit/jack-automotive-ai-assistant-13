import { ComparableListing } from "../types/ComparableListing";

export const truckListings: Record<string, ComparableListing[]> = {
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
};

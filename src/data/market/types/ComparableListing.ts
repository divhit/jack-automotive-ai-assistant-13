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
  photoUrl?: string; // Add support for explicit listing photo
};

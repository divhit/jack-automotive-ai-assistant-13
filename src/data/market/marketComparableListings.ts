
import { ComparableListing } from "./types/ComparableListing";
import { luxurySUVListings } from "./listings/luxurySUVs";
import { familySUVListings } from "./listings/familySUVs";
import { electricVehicleListings } from "./listings/electricVehicles";
import { truckListings } from "./listings/trucks";

export type { ComparableListing };

// Combine all listings into a single record
export const marketComparableListings: Record<string, ComparableListing[]> = {
  ...luxurySUVListings,
  ...familySUVListings,
  ...electricVehicleListings,
  ...truckListings,
};

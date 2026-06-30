import { useQuery } from "convex/react";
import { api } from "@repo/convex";

export function usePilotFeature(key: string): boolean {
  const features = useQuery(api.functions.pilot.getActivePilotFeatures, {});
  return features?.includes(key) ?? false;
}

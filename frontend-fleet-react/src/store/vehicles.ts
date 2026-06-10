import { create } from "zustand";
import type { Vehicle } from "@/types";

interface VehiclesState {
  vehicles: Vehicle[];
  lastFetchedAt: number | null;
  setVehicles: (vehicles: Vehicle[]) => void;
}

export const useVehiclesStore = create<VehiclesState>((set) => ({
  vehicles: [],
  lastFetchedAt: null,
  setVehicles: (vehicles) => set({ vehicles, lastFetchedAt: Date.now() }),
}));

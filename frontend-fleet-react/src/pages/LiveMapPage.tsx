import { useEffect, useState } from "react";
import { fetchVehicles } from "@/api/vehicles";
import { VehicleMap } from "@/components/FleetMap";
import type { Vehicle } from "@/types";

export function LiveMapPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      const data = await fetchVehicles();
      if (active) {
        setVehicles(data);
      }
    }

    void load();
    const interval = window.setInterval(load, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-xl font-semibold">Live Map</h1>
      </div>
      <div className="flex-1 p-4">
        <VehicleMap vehicles={vehicles} className="h-full" fitBounds />
      </div>
    </div>
  );
}

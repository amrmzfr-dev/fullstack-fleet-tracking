import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchVehicles } from "@/api/vehicles";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { useVehiclesStore } from "@/store/vehicles";
import type { Vehicle } from "@/types";

export function FleetOverviewPage() {
  const setVehicles = useVehiclesStore((state) => state.setVehicles);
  const [vehicles, setLocalVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await fetchVehicles();
        if (!active) {
          return;
        }
        setLocalVehicles(data);
        setVehicles(data);
        setError(null);
      } catch {
        if (active) {
          setError("Failed to load vehicles");
        }
      }
    }

    void load();
    const interval = window.setInterval(load, 10000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [setVehicles]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold">Fleet Overview</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Live fleet status, refreshed every 10 seconds.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicles</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Plate</th>
                <th className="px-3 py-2">Last Seen</th>
                <th className="px-3 py-2">Speed</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="px-3 py-3 font-medium">{vehicle.name}</td>
                  <td className="px-3 py-3">{vehicle.plate}</td>
                  <td className="px-3 py-3">{formatDateTime(vehicle.lastPosition?.recordedAt)}</td>
                  <td className="px-3 py-3">{vehicle.lastPosition?.speedKmh.toFixed(1) ?? "—"} km/h</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={vehicle.status} />
                  </td>
                  <td className="px-3 py-3">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/vehicles/${vehicle.id}`}>View</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                    No vehicles registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

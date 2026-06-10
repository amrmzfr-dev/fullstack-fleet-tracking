import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchAlerts, fetchLivePosition, fetchTrips, fetchVehicles } from "@/api/vehicles";
import { SingleVehicleMap } from "@/components/FleetMap";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime, formatDuration } from "@/lib/utils";
import type { Alert, LivePosition, Trip, Vehicle } from "@/types";

export function VehicleDetailPage() {
  const { id } = useParams();
  const vehicleId = Number(id);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [live, setLive] = useState<LivePosition | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    let active = true;

    async function loadVehicle() {
      const vehicles = await fetchVehicles();
      if (active) {
        setVehicle(vehicles.find((item) => item.id === vehicleId) ?? null);
      }
    }

    void loadVehicle();
  }, [vehicleId]);

  useEffect(() => {
    let active = true;

    async function loadLive() {
      try {
        const position = await fetchLivePosition(vehicleId);
        if (active) {
          setLive(position);
        }
      } catch {
        if (active) {
          setLive(null);
        }
      }
    }

    void loadLive();
    const interval = window.setInterval(loadLive, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [vehicleId]);

  useEffect(() => {
    async function loadTripsAndAlerts() {
      const [tripData, alertData] = await Promise.all([
        fetchTrips(vehicleId),
        fetchAlerts(vehicleId),
      ]);
      setTrips(tripData);
      setAlerts(alertData);
    }

    void loadTripsAndAlerts();
  }, [vehicleId]);

  if (!vehicle) {
    return <div className="p-6">Vehicle not found.</div>;
  }

  const status = vehicle.status;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold">{vehicle.name}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{vehicle.plate}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-base">Speed</CardTitle></CardHeader><CardContent>{live?.speedKmh.toFixed(1) ?? "—"} km/h</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader><CardContent><StatusBadge status={status} /></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Last Seen</CardTitle></CardHeader><CardContent>{formatDateTime(live?.recordedAt ?? vehicle.lastPosition?.recordedAt)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Trips</CardTitle></CardHeader><CardContent>{vehicle.tripCount}</CardContent></Card>
      </div>

      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="trips">Trip History</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          <SingleVehicleMap position={live} />
        </TabsContent>

        <TabsContent value="trips">
          <Card>
            <CardContent className="divide-y divide-zinc-200 p-0 dark:divide-zinc-800">
              {trips.map((trip) => (
                <div key={trip.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="font-medium">{formatDateTime(trip.startedAt)}</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDuration(trip.durationMinutes)} · {trip.distanceKm.toFixed(2)} km
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/vehicles/${vehicleId}/trips/${trip.id}`}>Playback</Link>
                  </Button>
                </div>
              ))}
              {trips.length === 0 && <div className="px-4 py-8 text-center text-zinc-500">No trips yet.</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardContent className="divide-y divide-zinc-200 p-0 dark:divide-zinc-800">
              {alerts.map((alert) => (
                <div key={alert.id} className="px-4 py-3">
                  <div className="font-medium capitalize">{alert.alertType}</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {alert.value.toFixed(1)} km/h · {formatDateTime(alert.triggeredAt)}
                  </div>
                </div>
              ))}
              {alerts.length === 0 && <div className="px-4 py-8 text-center text-zinc-500">No alerts.</div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchTripPositions, fetchTrips } from "@/api/vehicles";
import { TripMap } from "@/components/FleetMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatDuration } from "@/lib/utils";
import type { Position, Trip } from "@/types";

export function TripPlaybackPage() {
  const { id, tripId } = useParams();
  const vehicleId = Number(id);
  const tripNumericId = Number(tripId);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    async function load() {
      const [trips, tripPositions] = await Promise.all([
        fetchTrips(vehicleId),
        fetchTripPositions(vehicleId, tripNumericId),
      ]);
      setTrip(trips.find((item) => item.id === tripNumericId) ?? null);
      setPositions(tripPositions);
    }

    void load();
  }, [vehicleId, tripNumericId]);

  useEffect(() => {
    if (!playing || positions.length === 0) {
      return;
    }

    timerRef.current = window.setInterval(() => {
      setActiveIndex((current) => {
        if (current >= positions.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 50);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [playing, positions.length]);

  const maxSpeed = useMemo(
    () => positions.reduce((max, position) => Math.max(max, position.speedKmh), 0),
    [positions],
  );

  function handleReset() {
    setPlaying(false);
    setActiveIndex(0);
  }

  if (!trip) {
    return <div className="p-6">Trip not found.</div>;
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Trip Playback</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatDateTime(trip.startedAt)}</p>
        </div>
        <TripMap positions={positions} activeIndex={activeIndex} />
        <div className="flex gap-2">
          <Button onClick={() => setPlaying(true)} disabled={playing || positions.length === 0}>
            Play
          </Button>
          <Button variant="outline" onClick={() => setPlaying(false)}>
            Pause
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trip Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span>Distance</span><span>{trip.distanceKm.toFixed(2)} km</span></div>
          <div className="flex justify-between"><span>Duration</span><span>{formatDuration(trip.durationMinutes)}</span></div>
          <div className="flex justify-between"><span>Max speed</span><span>{maxSpeed.toFixed(1)} km/h</span></div>
          <div className="flex justify-between"><span>Points</span><span>{positions.length}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}

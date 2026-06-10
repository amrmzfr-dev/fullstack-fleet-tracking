import { MapContainer, Marker, Popup, TileLayer, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import type { LivePosition, Vehicle, VehicleStatus } from "@/types";
import { statusMarkerColor } from "@/components/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

function createIcon(colorClass: string) {
  return L.divIcon({
    className: "",
    html: `<div class="h-4 w-4 rounded-full border-2 border-white shadow ${colorClass}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function FitBounds({ positions }: { positions: Array<{ lat: number; lng: number }> }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) {
      return;
    }
    const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, positions]);

  return null;
}

interface VehicleMapProps {
  vehicles: Vehicle[];
  className?: string;
  fitBounds?: boolean;
}

export function VehicleMap({ vehicles, className = "h-[500px]", fitBounds = false }: VehicleMapProps) {
  const points = vehicles
    .filter((v) => v.lastPosition)
    .map((v) => ({ lat: v.lastPosition!.lat, lng: v.lastPosition!.lng }));

  return (
    <div className={className}>
      <MapContainer center={[14.5995, 120.9842]} zoom={6} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {fitBounds && <FitBounds positions={points} />}
        {vehicles.map((vehicle) => {
          if (!vehicle.lastPosition) {
            return null;
          }
          return (
            <Marker
              key={vehicle.id}
              position={[vehicle.lastPosition.lat, vehicle.lastPosition.lng]}
              icon={createIcon(statusMarkerColor(vehicle.status))}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <div className="font-medium">{vehicle.name}</div>
                  <div>{vehicle.plate}</div>
                  <div>{vehicle.lastPosition.speedKmh.toFixed(1)} km/h</div>
                  <div>{formatDateTime(vehicle.lastPosition.recordedAt)}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

interface SingleVehicleMapProps {
  position: LivePosition | null;
  className?: string;
}

export function SingleVehicleMap({ position, className = "h-72" }: SingleVehicleMapProps) {
  if (!position) {
    return (
      <div className={`flex items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 ${className}`}>
        No live position available
      </div>
    );
  }

  return (
    <div className={className}>
      <MapContainer center={[position.lat, position.lng]} zoom={14} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[position.lat, position.lng]} icon={createIcon("bg-blue-500")} />
        <FitBounds positions={[{ lat: position.lat, lng: position.lng }]} />
      </MapContainer>
    </div>
  );
}

interface TripMapProps {
  positions: Array<{ lat: number; lng: number; speedKmh?: number }>;
  activeIndex: number;
  className?: string;
}

export function TripMap({ positions, activeIndex, className = "h-[480px]" }: TripMapProps) {
  const latLngs = positions.map((p) => [p.lat, p.lng] as [number, number]);
  const active = positions[activeIndex];

  return (
    <div className={className}>
      <MapContainer center={latLngs[0] ?? [14.5995, 120.9842]} zoom={13} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {latLngs.length > 0 && <FitBounds positions={positions} />}
        {latLngs.length > 1 && <Polyline positions={latLngs} pathOptions={{ color: "#2563eb" }} />}
        {latLngs.length > 0 && (
          <Marker position={latLngs[0]} icon={createIcon("bg-emerald-500")} />
        )}
        {latLngs.length > 1 && (
          <Marker position={latLngs[latLngs.length - 1]} icon={createIcon("bg-red-500")} />
        )}
        {active && (
          <Marker position={[active.lat, active.lng]} icon={createIcon("bg-blue-500")} />
        )}
      </MapContainer>
    </div>
  );
}

export function vehicleStatusFromLive(position: LivePosition | null): VehicleStatus {
  if (!position) {
    return "NoSignal";
  }
  const ageMs = Date.now() - new Date(position.recordedAt).getTime();
  if (ageMs > 10 * 60 * 1000) {
    return "NoSignal";
  }
  if (position.speedKmh > 0 && ageMs <= 2 * 60 * 1000) {
    return "Moving";
  }
  return "Parked";
}

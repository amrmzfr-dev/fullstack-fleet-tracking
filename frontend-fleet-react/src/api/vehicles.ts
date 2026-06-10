import { api } from "@/api/client";
import type {
  Alert,
  LivePosition,
  Position,
  RegisterVehicleResponse,
  Trip,
  Vehicle,
} from "@/types";

export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data } = await api.get<{ vehicles: Vehicle[] }>("/api/v1/vehicles");
  return data.vehicles;
}

export async function registerVehicle(payload: {
  name: string;
  plate: string;
  deviceId: string;
}): Promise<RegisterVehicleResponse> {
  const { data } = await api.post<RegisterVehicleResponse>("/api/v1/vehicles", payload);
  return data;
}

export async function fetchLivePosition(vehicleId: number): Promise<LivePosition> {
  const { data } = await api.get<LivePosition>(`/api/v1/vehicles/${vehicleId}/live`);
  return data;
}

export async function fetchPositions(
  vehicleId: number,
  params?: { from?: string; to?: string; limit?: number },
): Promise<Position[]> {
  const { data } = await api.get<{ positions: Position[] }>(
    `/api/v1/vehicles/${vehicleId}/positions`,
    { params },
  );
  return data.positions;
}

export async function fetchTrips(vehicleId: number): Promise<Trip[]> {
  const { data } = await api.get<{ trips: Trip[] }>(`/api/v1/vehicles/${vehicleId}/trips`);
  return data.trips;
}

export async function fetchTripPositions(vehicleId: number, tripId: number): Promise<Position[]> {
  const { data } = await api.get<{ positions: Position[] }>(
    `/api/v1/vehicles/${vehicleId}/trips/${tripId}/positions`,
  );
  return data.positions;
}

export async function fetchAlerts(vehicleId?: number, limit = 50): Promise<Alert[]> {
  const { data } = await api.get<{ alerts: Alert[] }>("/api/v1/alerts", {
    params: { vehicleId, limit },
  });
  return data.alerts;
}

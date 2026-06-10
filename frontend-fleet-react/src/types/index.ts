export type VehicleStatus = "Moving" | "Parked" | "NoSignal";

export interface Position {
  id?: number;
  lat: number;
  lng: number;
  speedKmh: number;
  heading: number;
  satellites: number;
  hdop: number;
  recordedAt: string;
}

export interface Vehicle {
  id: number;
  name: string;
  plate: string;
  deviceId: string;
  lastPosition: Position | null;
  status: VehicleStatus;
  tripCount: number;
}

export interface Trip {
  id: number;
  startedAt: string;
  endedAt: string | null;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  distanceKm: number;
  durationMinutes: number;
}

export interface Alert {
  id: number;
  vehicleId: number;
  alertType: string;
  value: number;
  lat: number;
  lng: number;
  triggeredAt: string;
}

export interface LivePosition {
  vehicleId: number;
  lat: number;
  lng: number;
  speedKmh: number;
  heading: number;
  satellites: number;
  hdop: number;
  recordedAt: string;
}

export interface RegisterVehicleResponse {
  id: number;
  name: string;
  plate: string;
  deviceId: string;
  apiKey: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
}

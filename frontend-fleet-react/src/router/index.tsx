import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedLayout } from "@/router/ProtectedLayout";
import { FleetOverviewPage } from "@/pages/FleetOverviewPage";
import { LiveMapPage } from "@/pages/LiveMapPage";
import { RegisterVehiclePage } from "@/pages/RegisterVehiclePage";
import { TripPlaybackPage } from "@/pages/TripPlaybackPage";
import { VehicleDetailPage } from "@/pages/VehicleDetailPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<FleetOverviewPage />} />
          <Route path="/map" element={<LiveMapPage />} />
          <Route path="/vehicles/new" element={<RegisterVehiclePage />} />
          <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
          <Route path="/vehicles/:id/trips/:tripId" element={<TripPlaybackPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedLayout } from "@/router/ProtectedLayout";
import { FleetOverviewPage } from "@/pages/FleetOverviewPage";
import { LiveMapPage } from "@/pages/LiveMapPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterVehiclePage } from "@/pages/RegisterVehiclePage";
import { TripPlaybackPage } from "@/pages/TripPlaybackPage";
import { VehicleDetailPage } from "@/pages/VehicleDetailPage";
import { useAuthStore } from "@/store/auth";

function LoginRoute() {
  const token = useAuthStore((state) => state.token);
  if (token) {
    return <Navigate to="/" replace />;
  }
  return <LoginPage />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
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

import { Navigate, Outlet } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useAuthStore } from "@/store/auth";

export function ProtectedLayout() {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <Outlet />
    </div>
  );
}

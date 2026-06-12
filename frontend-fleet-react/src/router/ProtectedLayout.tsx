import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/Navbar";

export function ProtectedLayout() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Outlet />
    </div>
  );
}

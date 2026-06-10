import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Map, Plus, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuthStore } from "@/store/auth";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive
      ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
  }`;

export function Navbar() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Truck className="h-5 w-5" />
            Fleet Tracker
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/" className={linkClass} end>
              Overview
            </NavLink>
            <NavLink to="/map" className={linkClass}>
              <span className="flex items-center gap-1">
                <Map className="h-4 w-4" />
                Live Map
              </span>
            </NavLink>
            <NavLink to="/vehicles/new" className={linkClass}>
              <span className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Register
              </span>
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}

import { cn } from "@/lib/utils";
import type { VehicleStatus } from "@/types";

const styles: Record<VehicleStatus, string> = {
  Moving: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  Parked: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  NoSignal: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  NoGps: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

const labels: Record<VehicleStatus, string> = {
  Moving: "Moving",
  Parked: "Parked",
  NoSignal: "No signal",
  NoGps: "Online, no GPS",
};

export function StatusBadge({ status }: { status: VehicleStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", styles[status])}>
      {labels[status]}
    </span>
  );
}

export function statusMarkerColor(status: VehicleStatus): string {
  switch (status) {
    case "Moving":
      return "bg-emerald-500";
    case "Parked":
      return "bg-zinc-500";
    case "NoSignal":
      return "bg-red-500";
    case "NoGps":
      return "bg-amber-500";
  }
}

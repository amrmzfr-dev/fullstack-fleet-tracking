import { useState } from "react";
import { registerVehicle } from "@/api/vehicles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterVehiclePage() {
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await registerVehicle({ name, plate, deviceId });
      setApiKey(result.apiKey);
      setName("");
      setPlate("");
      setDeviceId("");
    } catch {
      setError("Failed to register vehicle");
    } finally {
      setLoading(false);
    }
  }

  async function copyApiKey() {
    if (apiKey) {
      await navigator.clipboard.writeText(apiKey);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Register Vehicle</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plate">Plate</Label>
              <Input id="plate" value={plate} onChange={(e) => setPlate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deviceId">Device ID</Label>
              <Input id="deviceId" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Registering..." : "Register vehicle"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={apiKey !== null} onOpenChange={(open) => !open && setApiKey(null)}>
        <DialogContent>
          <DialogTitle>Vehicle API Key</DialogTitle>
          <DialogDescription>
            Copy this API key now. It will not be shown again.
          </DialogDescription>
          <div className="mt-4 break-all rounded-md border border-zinc-200 bg-zinc-50 p-3 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-950">
            {apiKey}
          </div>
          <Button className="mt-4" onClick={() => void copyApiKey()}>
            Copy to clipboard
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

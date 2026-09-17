import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Bluetooth, Radio } from "lucide-react";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addWeight, saveBleDevice } from "@/lib/server/fitness";
import {
  connectGatt,
  listenBroadcast,
  supportsWebBluetooth,
  type ScaleReading,
  type ScanHandle,
  type SeenDevice,
} from "@/lib/ble/openscale";
import { keys } from "@/lib/query";
import { toast } from "sonner";

export const Route = createFileRoute("/scale")({ component: ScalePage });

type FoundDevice = {
  key: string;
  name: string;
  rssi?: number;
  reading: ScaleReading | null;
  lastSeen: number;
};

function ScalePage() {
  const [status, setStatus] = useState("Idle");
  const [reading, setReading] = useState<ScaleReading | null>(null);
  const [mode, setMode] = useState<"broadcast" | "gatt" | null>(null);
  const [devices, setDevices] = useState<Record<string, FoundDevice>>({});
  const handle = useRef<ScanHandle | null>(null);
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: (r: ScaleReading) =>
      addWeight({
        data: {
          valueKg: r.kg,
          source: "ble",
          deviceName: r.deviceName,
          bodyFatPct: r.bodyFatPct,
        },
      }),
    onSuccess: () => {
      toast.success("Weight saved");
      void qc.invalidateQueries({ queryKey: keys.weight });
      void qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
  const remember = useMutation({
    mutationFn: (name: string) => saveBleDevice({ data: { name, kind: "scale" } }),
  });

  useEffect(() => {
    return () => handle.current?.stop();
  }, []);

  function useDeviceReading(r: ScaleReading) {
    setReading(r);
    setStatus(r.stable ? `Stable · ${r.deviceName}` : `Live · ${r.deviceName}`);
    remember.mutate(r.deviceName);
  }

  async function startBroadcast() {
    if (!supportsWebBluetooth()) {
      toast.error("Web Bluetooth needs Chrome on Android. Log weight manually otherwise.");
      return;
    }
    handle.current?.stop();
    setDevices({});
    try {
      setMode("broadcast");
      setStatus("Listening for openScale broadcast…");
      handle.current = await listenBroadcast((seen: SeenDevice, r: ScaleReading | null) => {
        const key = seen.deviceId || seen.name || "unknown";
        setDevices((prev) => ({
          ...prev,
          [key]: {
            key,
            name: seen.name || prev[key]?.name || "Nameless",
            rssi: seen.rssi,
            reading: r ?? prev[key]?.reading ?? null,
            lastSeen: Date.now(),
          },
        }));
      });
      setStatus("Step on the scale — reading advertisements");
    } catch (e) {
      setMode(null);
      setStatus("Cancelled");
      toast.message(e instanceof Error ? e.message : "Could not start broadcast scan");
    }
  }

  async function startGatt() {
    if (!supportsWebBluetooth()) {
      toast.error("Web Bluetooth needs Chrome on Android.");
      return;
    }
    handle.current?.stop();
    try {
      setMode("gatt");
      setStatus("Scanning for Weight Scale service…");
      handle.current = await connectGatt(useDeviceReading);
      setStatus("Connected — step on the scale");
    } catch (e) {
      setMode(null);
      setStatus("Cancelled or unsupported device");
      toast.message(e instanceof Error ? e.message : "Could not connect");
    }
  }

  function stop() {
    handle.current?.stop();
    handle.current = null;
    setMode(null);
    setStatus("Idle");
  }

  const foundList = Object.values(devices).sort((a, b) => b.lastSeen - a.lastSeen);

  return (
    <Screen title="Scale">
      <Card className="mb-4">
        <p className="text-[13px] font-medium text-muted">Live reading</p>
        <p className="font-display text-[44px] font-bold tabular leading-none">
          {reading != null ? `${reading.kg.toFixed(1)}` : "—"}
          <span className="ml-1 text-[18px] font-semibold text-muted">kg</span>
        </p>
        {reading?.impedanceOhm ? (
          <p className="mt-1 text-[13px] text-muted">Impedance {Math.round(reading.impedanceOhm)} Ω</p>
        ) : null}
        <p className="mt-2 text-[13px] text-muted">{status}</p>
        {reading?.stable ? (
          <p className="mt-1 text-[12px] font-semibold text-success">Stabilized</p>
        ) : null}
      </Card>

      <Button className="mb-2 w-full" onClick={() => void startBroadcast()} disabled={mode === "broadcast"}>
        <Radio className="size-4" />
        Listen for broadcast scale
      </Button>
      <Button className="mb-2 w-full" variant="secondary" onClick={() => void startGatt()} disabled={mode === "gatt"}>
        <Bluetooth className="size-4" />
        Connect standard BLE scale
      </Button>
      {mode ? (
        <Button className="mb-3 w-full" variant="ghost" onClick={stop}>
          Stop listening
        </Button>
      ) : null}
      {reading != null ? (
        <Button className="mb-4 w-full" variant="elevated" onClick={() => save.mutate(reading)} disabled={save.isPending}>
          Save {reading.kg.toFixed(1)} kg
        </Button>
      ) : null}

      {mode === "broadcast" && foundList.length > 0 ? (
        <div className="mb-4 space-y-2">
          <p className="text-[13px] font-medium text-muted">Found devices</p>
          {foundList
            .filter((d) => d.reading != null)
            .map((d) => (
              <Card key={d.key} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-[12px] text-muted">
                    {d.rssi != null ? `${d.rssi} dBm` : "—"} · {d.reading!.kg.toFixed(1)} kg
                  </p>
                </div>
                <Button onClick={() => useDeviceReading(d.reading!)}>Use</Button>
              </Card>
            ))}
        </div>
      ) : null}

      <Card>
        <p className="text-[15px] font-semibold">openScale broadcast</p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Many cheap scales never open a GATT connection. They broadcast weight in BLE
          advertisements — the same path openScale uses for AAA002, OKOK/Chipsea (ADV, C0,
          v1.1), and Xiaomi Mi Scale. Step on the scale; once a device's reading decodes it'll
          get a "Use" button above.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Standard Weight Scale service (0x181D) is the second button. If neither works, log
          from Weight instead.
        </p>
      </Card>
    </Screen>
  );
}

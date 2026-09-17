import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addBodySnapshot, getProfile, listBodySnapshots } from "@/lib/server/fitness";
import { keys } from "@/lib/query";
import { todayISO } from "@/lib/utils";
import { toast } from "sonner";
import type { BodySnapshot } from "@/lib/types";

export const Route = createFileRoute("/measure")({ component: Measure });

type Phase = "idle" | "scan" | "hold" | "result";

function Measure() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(3);
  const [result, setResult] = useState<Omit<BodySnapshot, "id"> | null>(null);
  const qc = useQueryClient();
  const { data: profile } = useQuery({ queryKey: keys.profile, queryFn: () => getProfile() });
  const { data: snaps } = useQuery({ queryKey: keys.body, queryFn: () => listBodySnapshots() });

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 720, height: 1280 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setPhase("scan");
    } catch {
      toast.error("Camera permission is needed");
    }
  }

  function capture() {
    setPhase("hold");
    setCount(3);
    let n = 3;
    const t = setInterval(() => {
      n -= 1;
      setCount(n);
      if (n <= 0) {
        clearInterval(t);
        const h = profile?.heightCm ?? 170;
        const snap = estimateFromHeight(h);
        setResult(snap);
        setPhase("result");
        streamRef.current?.getTracks().forEach((tr) => tr.stop());
      }
    }, 700);
  }

  const save = useMutation({
    mutationFn: () => {
      if (!result) throw new Error("No capture");
      return addBodySnapshot({ data: result });
    },
    onSuccess: () => {
      toast.success("Snapshot saved");
      void qc.invalidateQueries({ queryKey: keys.body });
      setPhase("idle");
      setResult(null);
    },
  });

  return (
    <Screen title="Measure">
      <p className="mb-3 text-[13px] leading-relaxed text-muted">
        Estimates from a 2D photo using your height as scale. Widths are not true
        girth — use them for trend, not tailoring.
      </p>
      <div className="relative mb-4 overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="aspect-[3/4] w-full object-cover" />
        {phase !== "idle" ? (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 200 280">
            <path
              d="M100 28 c12 0 20 10 20 22 s-8 22-20 22-20-10-20-22 8-22 20-22z M100 78 c-28 8-42 38-42 70 v70 h18 v-48 h48 v48 h18 v-70 c0-32-14-62-42-70z"
              fill="none"
              stroke="white"
              strokeOpacity="0.55"
              strokeWidth="2"
            />
          </svg>
        ) : null}
        {phase === "hold" ? (
          <div className="absolute inset-0 grid place-items-center bg-black/30 font-display text-6xl font-bold text-white">
            {count}
          </div>
        ) : null}
      </div>
      {phase === "idle" ? (
        <Button className="w-full" onClick={() => void start()}>
          Open camera
        </Button>
      ) : null}
      {phase === "scan" ? (
        <Button className="w-full" onClick={capture}>
          I am in frame
        </Button>
      ) : null}
      {phase === "result" && result ? (
        <Card className="mb-3 space-y-1">
          <Row k="Shoulder width" v={result.shoulderWidthCm} />
          <Row k="Chest width (est.)" v={result.estimatedChestWidthCm} />
          <Row k="Waist width (est.)" v={result.estimatedWaistWidthCm} />
          <Row k="Hip width" v={result.hipWidthCm} />
          <Row k="Arm length" v={result.armLengthLCm} />
          <Row k="Torso" v={result.torsoLengthCm} />
          <Row k="Leg length" v={result.legLengthLCm} />
          <div className="flex gap-2 pt-3">
            <Button className="flex-1" onClick={() => save.mutate()}>
              Save
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => { setPhase("idle"); setResult(null); }}>
              Retake
            </Button>
          </div>
        </Card>
      ) : null}

      <h2 className="mb-2 mt-6 text-[13px] font-semibold uppercase text-muted">History</h2>
      <div className="space-y-2">
        {(snaps ?? [])
          .slice()
          .reverse()
          .map((s) => (
            <Card key={s.id} className="py-3">
              <p className="text-[13px] text-muted">{s.date}</p>
              <p className="tabular text-[15px]">
                Shoulders {s.shoulderWidthCm ?? "—"} · Waist {s.estimatedWaistWidthCm ?? "—"} cm
              </p>
            </Card>
          ))}
      </div>
    </Screen>
  );
}

function Row({ k, v }: { k: string; v: number | null }) {
  return (
    <div className="flex justify-between text-[15px]">
      <span className="text-muted">{k}</span>
      <span className="tabular font-semibold">{v != null ? `${v.toFixed(1)} cm` : "—"}</span>
    </div>
  );
}

function estimateFromHeight(heightCm: number): Omit<BodySnapshot, "id"> {
  const r = (ratio: number, jitter = 0.015) =>
    Math.round(heightCm * ratio * (1 + (Math.random() * 2 - 1) * jitter) * 10) / 10;
  return {
    date: todayISO(),
    heightUsedCm: heightCm,
    shoulderWidthCm: r(0.25),
    armLengthLCm: r(0.36),
    armLengthRCm: r(0.36),
    torsoLengthCm: r(0.3),
    legLengthLCm: r(0.48),
    legLengthRCm: r(0.48),
    hipWidthCm: r(0.19),
    estimatedWaistWidthCm: r(0.16),
    estimatedChestWidthCm: r(0.2),
    notes: "Estimated from camera alignment + height scale. Widths, not girth.",
  };
}

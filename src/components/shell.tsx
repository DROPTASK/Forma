import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Dumbbell,
  House,
  LayoutGrid,
  Pause,
  PersonStanding,
  Play,
  Utensils,
} from "lucide-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import { Toaster } from "sonner";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ThemeProvider } from "@/components/theme";
import { makeQueryClient } from "@/lib/query";
import { usePlayer } from "@/lib/player";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Today", icon: House, match: (p: string) => p === "/" },
  {
    to: "/train",
    label: "Train",
    icon: Dumbbell,
    match: (p: string) => p.startsWith("/train") || p.startsWith("/session") || p.startsWith("/exercise"),
  },
  {
    to: "/eat",
    label: "Eat",
    icon: Utensils,
    match: (p: string) => p.startsWith("/eat") || p.startsWith("/diet"),
  },
  {
    to: "/body",
    label: "Body",
    icon: PersonStanding,
    match: (p: string) =>
      p.startsWith("/body") ||
      p.startsWith("/weight") ||
      p.startsWith("/measure") ||
      p.startsWith("/map") ||
      p.startsWith("/scale"),
  },
  {
    to: "/more",
    label: "More",
    icon: LayoutGrid,
    match: (p: string) =>
      ["/more", "/schedule", "/challenges", "/todos", "/journal", "/ai", "/music", "/settings"].some(
        (x) => p === x || p.startsWith(`${x}/`),
      ),
  },
] as const;

function MiniPlayer() {
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const toggle = usePlayer((s) => s.toggle);
  const track = queue[index];
  if (!track) return null;
  return (
    <Link to="/music" className="glass mx-3 mb-2 flex items-center gap-3 rounded-[16px] px-3 py-2">
      {track.artworkUrl ? (
        <img src={track.artworkUrl} alt="" className="size-10 rounded-[8px] object-cover" />
      ) : (
        <div className="size-10 rounded-[8px] bg-separator" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{track.title}</p>
        <p className="truncate text-[12px] text-muted">{track.artistName}</p>
      </div>
      <button
        type="button"
        className="pressable grid size-10 place-items-center rounded-full bg-fg text-bg"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle();
        }}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
      </button>
    </Link>
  );
}

function Chrome({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-dvh bg-separator">
      <div className="relative mx-auto flex h-dvh max-w-[430px] flex-col overflow-hidden bg-bg">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="pb-4">{children}</div>
        </div>
        <div className="shrink-0 z-40">
          <MiniPlayer />
          <nav className="glass border-t border-separator/80 px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <ul className="flex items-stretch justify-between">
              {tabs.map((t) => {
                const active = t.match(pathname);
                const Icon = t.icon;
                return (
                  <li key={t.to} className="flex-1">
                    <Link
                      to={t.to}
                      className={cn(
                        "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[14px] py-1 text-[10px] font-semibold tracking-wide",
                        active ? "text-accent" : "text-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-8 place-items-center rounded-full",
                          active ? "bg-accent/12" : "",
                        )}
                      >
                        <Icon className="size-5" strokeWidth={active ? 2.4 : 1.75} />
                      </span>
                      {t.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}

function Guard({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="min-h-dvh bg-bg">
        <div className="mx-auto max-w-[430px] px-5 pt-16">
          <div className="h-10 w-40 animate-pulse rounded-lg bg-separator" />
          <div className="mt-8 h-48 animate-pulse rounded-xl bg-card" />
          <div className="mt-3 h-32 animate-pulse rounded-xl bg-card" />
        </div>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const client = useMemo(() => makeQueryClient(), []);
  return (
    <ThemeProvider>
      <QueryClientProvider client={client}>
        {children}
        <Toaster position="top-center" richColors />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export function AppFrame() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/login") {
    return (
      <Providers>
        <Outlet />
      </Providers>
    );
  }
  return (
    <Providers>
      <Guard>
        <Chrome>
          <Outlet />
        </Chrome>
      </Guard>
    </Providers>
  );
}

export function Screen({
  title,
  children,
  trailing,
}: {
  title: string;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="px-5 pt-6">
      <header className="mb-5 flex items-end justify-between gap-3">
        <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-tight">{title}</h1>
        {trailing ? <div className="mb-1 flex items-center gap-2">{trailing}</div> : null}
      </header>
      {children}
    </div>
  );
}

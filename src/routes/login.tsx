import { createFileRoute } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  if (!isPending && user) return <Navigate to="/" />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col justify-between bg-bg px-6 py-10">
      <div className="pt-10">
        <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-muted">Fitness, refined</p>
        <h1 className="mt-3 font-display text-[48px] font-bold leading-[0.95] tracking-tight">Forma</h1>
        <p className="mt-4 max-w-[18rem] text-[17px] leading-relaxed text-muted">
          Train, eat, and measure in one place. Ask AI to log the tedious parts.
        </p>
        <div className="mt-10 space-y-3">
          <RingPreview />
        </div>
      </div>
      <div className="space-y-3 pb-[env(safe-area-inset-bottom)]">
        {authEnabled ? (
          GROK_PROVIDERS.map((p) => (
            <button
              key={p.providerId}
              type="button"
              onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              className="pressable h-12 w-full rounded-[14px] bg-fg text-[17px] font-semibold text-bg"
            >
              Continue with {p.label}
            </button>
          ))
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}
        <p className="text-center text-[12px] text-muted">
          Estimates are for training progress, not medical use.
        </p>
      </div>
    </main>
  );
}

function RingPreview() {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" aria-hidden="true">
      <circle cx="80" cy="80" r="68" fill="none" stroke="var(--app-separator)" strokeWidth="12" />
      <circle cx="80" cy="80" r="52" fill="none" stroke="var(--app-separator)" strokeWidth="12" />
      <circle cx="80" cy="80" r="36" fill="none" stroke="var(--app-separator)" strokeWidth="12" />
      <circle
        cx="80"
        cy="80"
        r="68"
        fill="none"
        stroke="var(--color-ring-move)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray="300 427"
        transform="rotate(-90 80 80)"
      />
      <circle
        cx="80"
        cy="80"
        r="52"
        fill="none"
        stroke="var(--color-ring-ex)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray="220 327"
        transform="rotate(-90 80 80)"
      />
      <circle
        cx="80"
        cy="80"
        r="36"
        fill="none"
        stroke="var(--color-ring-stand)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray="140 226"
        transform="rotate(-90 80 80)"
      />
    </svg>
  );
}

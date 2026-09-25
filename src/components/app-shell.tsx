"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type SessionUser } from "@/lib/client-api";
import { Button } from "@/components/ui/button";

export function useSession(requiredRole?: "shipper" | "receiver") {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ user: SessionUser | null }>("/api/auth/me");
        if (cancelled) return;
        if (!data.user) {
          router.replace("/login");
          return;
        }
        if (requiredRole && data.user.role !== requiredRole) {
          router.replace(data.user.role === "shipper" ? "/shipper" : "/receiver");
          return;
        }
        setUser(data.user);
      } catch {
        if (!cancelled) {
          setError("无法加载登录状态");
          router.replace("/login");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requiredRole, router]);

  return { user, loading, error };
}

export function AppHeader({
  title,
  user,
}: {
  title: string;
  user: SessionUser;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await api("/api/auth", { method: "POST", body: JSON.stringify({ mode: "logout" }) });
      router.replace("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-[#fffaf2]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold tracking-tight text-ink sm:text-xl">
            排发助手
          </p>
          <p className="truncate text-sm text-muted-foreground">{title}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden text-right text-sm sm:block">
            <p className="font-medium text-foreground">{user.cn}</p>
            <p className="text-muted-foreground">
              {user.role === "shipper" ? "发货方" : "收货方"} · {user.username}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={logout} disabled={busy}>
            {busy ? "退出中…" : "退出"}
          </Button>
        </div>
      </div>
    </header>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/60 px-5 py-10 text-center">
      <p className="font-display text-lg font-medium text-ink">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}

export function LoadingBlock({ label = "加载中…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <span className="inline-block size-4 animate-spin rounded-full border-2 border-sea border-t-transparent" />
      {label}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBanner } from "@/components/app-shell";

export default function RegisterPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth", {
        method: "POST",
        body: JSON.stringify({ mode: "register", nickname }),
      });
      toast.success("注册成功");
      router.replace("/receiver");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "注册失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <div className="rise-in rounded-2xl border border-border bg-surface p-6 shadow-sm shadow-ink/5 sm:p-8">
        <Link href="/" className="font-display text-2xl font-semibold text-ink">
          排发助手
        </Link>
        <h1 className="mt-3 text-lg font-medium">收货方注册</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          填写昵称即可，无需密码。之后用同一昵称登录。
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error && <ErrorBanner message={error} />}
          <div className="space-y-2">
            <Label htmlFor="nickname">昵称</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例如：小明"
              autoComplete="nickname"
              autoFocus
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "注册中…" : "注册并登录"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          已有昵称？{" "}
          <Link href="/login" className="font-medium text-sea hover:underline">
            去登录
          </Link>
        </p>
      </div>
    </main>
  );
}

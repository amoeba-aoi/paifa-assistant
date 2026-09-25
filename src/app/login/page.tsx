"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorBanner } from "@/components/app-shell";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"shipper" | "receiver">("shipper");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ user: { role: string } }>("/api/auth", {
        method: "POST",
        body: JSON.stringify({ mode: "login", role, username, password }),
      });
      toast.success("登录成功");
      router.replace(data.user.role === "shipper" ? "/shipper" : "/receiver");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "登录失败";
      setError(msg);
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
        <p className="mt-2 text-sm text-muted-foreground">登录后继续管理库存或提交排发登记。</p>

        <Tabs
          value={role}
          onValueChange={(v) => setRole(v as "shipper" | "receiver")}
          className="mt-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="shipper">发货方</TabsTrigger>
            <TabsTrigger value="receiver">收货方</TabsTrigger>
          </TabsList>
          <TabsContent value="shipper" className="mt-4 text-sm text-muted-foreground">
            使用预设发货方账号登录（默认见 README）。
          </TabsContent>
          <TabsContent value="receiver" className="mt-4 text-sm text-muted-foreground">
            使用已注册的收货方用户名登录。
          </TabsContent>
        </Tabs>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          {error && <ErrorBanner message={error} />}
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "登录中…" : "登录"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          还没有收货方账号？{" "}
          <Link href="/register" className="font-medium text-sea hover:underline">
            去注册
          </Link>
        </p>
      </div>
    </main>
  );
}

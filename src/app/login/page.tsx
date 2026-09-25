"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Input, isImeComposing } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBanner } from "@/components/app-shell";

export default function LoginPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Guard against Enter confirming IME candidates
    const ne = e.nativeEvent as unknown as { submitter?: HTMLElement; isComposing?: boolean };
    if (ne.isComposing) return;

    const name = nickname.trim();
    if (!name) {
      setError("请填写昵称");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const data = await api<{ user: { role: string }; created?: boolean }>("/api/auth", {
        method: "POST",
        body: JSON.stringify({ mode: "login", nickname: name }),
      });
      toast.success(
        data.user.role === "shipper"
          ? "登录成功"
          : data.created
            ? "已用该昵称注册并登录"
            : "登录成功",
      );
      router.replace(data.user.role === "shipper" ? "/shipper" : "/receiver");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "登录失败");
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
        <p className="mt-2 text-sm text-muted-foreground">
          输入昵称即可进入，支持中文。发货方用{" "}
          <span className="font-medium text-foreground">shipper</span>
          {" "}或「发货方」；其他昵称若尚未使用，将自动注册为收货方。
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-6 space-y-4"
          onKeyDown={(event) => {
            if (event.key === "Enter" && isImeComposing(event)) {
              event.preventDefault();
            }
          }}
        >
          {error && <ErrorBanner message={error} />}
          <div className="space-y-2">
            <Label htmlFor="nickname">昵称</Label>
            <Input
              id="nickname"
              name="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例如：shipper 或 小明"
              autoComplete="off"
              spellCheck={false}
              autoFocus
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "进入中…" : "进入"}
          </Button>
        </form>
      </div>
    </main>
  );
}

"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AppHeader,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  useSession,
} from "@/components/app-shell";
import { api, ApiError } from "@/lib/client-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Module = { id: string; name: string };
type RequestRow = {
  id: string;
  moduleId: string;
  itemName: string;
  quantity: number;
  order: number;
  status: "pending" | "cleared";
  createdAt: string;
  clearedAt?: string;
};

export default function ReceiverPage() {
  const { user, loading } = useSession("receiver");
  const [modules, setModules] = useState<Module[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [moduleId, setModuleId] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [order, setOrder] = useState("1");

  const refresh = useCallback(async () => {
    setDataLoading(true);
    setPageError(null);
    try {
      const [modData, reqData] = await Promise.all([
        api<{ modules: Module[] }>("/api/modules"),
        api<{ requests: RequestRow[] }>("/api/requests"),
      ]);
      setModules(modData.modules);
      setRequests(reqData.requests);
      setModuleId((prev) => prev || modData.modules[0]?.id || "");
    } catch (err) {
      setPageError(err instanceof ApiError ? err.message : "加载失败");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user, refresh]);

  async function submitRequest(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/requests", {
        method: "POST",
        body: JSON.stringify({
          moduleId,
          itemName,
          quantity: Number(quantity),
          order: Number(order),
        }),
      });
      setItemName("");
      toast.success("登记成功");
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "登记失败");
    } finally {
      setBusy(false);
    }
  }

  async function removeRequest(id: string) {
    setBusy(true);
    try {
      await api(`/api/requests?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      toast.success("已删除登记");
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return <LoadingBlock label="正在验证收货方身份…" />;
  }

  const moduleName = (id: string) => modules.find((m) => m.id === id)?.name ?? "未知模块";
  const pending = requests.filter((r) => r.status === "pending");
  const cleared = requests.filter((r) => r.status === "cleared");

  return (
    <div className="min-h-full flex-1">
      <AppHeader title="收货方 · 排发登记" user={user} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        {pageError && <ErrorBanner message={pageError} />}

        <section className="rise-in rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <h2 className="font-display text-xl font-semibold text-ink">新建排发登记</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            选择哪一期谷子，填写谷子名、数量与排发顺序（数字越小越优先）。
          </p>

          {modules.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="发货方尚未创建模块"
                description="请等待发货方创建「哪一期谷子」后再登记。"
              />
            </div>
          ) : (
            <form onSubmit={submitRequest} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="moduleId">哪一期谷子</Label>
                <select
                  id="moduleId"
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={moduleId}
                  onChange={(e) => setModuleId(e.target.value)}
                  required
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="itemName">谷子名</Label>
                <Input
                  id="itemName"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">数量</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">排发顺序</Label>
                <Input
                  id="order"
                  type="number"
                  step={1}
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy} className="w-full sm:w-auto">
                  {busy ? "提交中…" : "提交登记"}
                </Button>
              </div>
            </form>
          )}
        </section>

        {dataLoading ? (
          <LoadingBlock />
        ) : (
          <Tabs defaultValue="pending" className="rise-in-delay">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">待排发 ({pending.length})</TabsTrigger>
              <TabsTrigger value="cleared">已清货 ({cleared.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4 space-y-3">
              {pending.length === 0 ? (
                <EmptyState title="暂无待排发登记" description="提交登记后会出现在这里。" />
              ) : (
                pending
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((r) => (
                    <article
                      key={r.id}
                      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{r.itemName} × {r.quantity}</p>
                          <Badge variant="secondary">顺序 {r.order}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {moduleName(r.moduleId)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => removeRequest(r.id)}
                      >
                        删除
                      </Button>
                    </article>
                  ))
              )}
            </TabsContent>

            <TabsContent value="cleared" className="mt-4 space-y-3">
              {cleared.length === 0 ? (
                <EmptyState title="尚无已清货记录" description="发货方完成发货后会显示在这里。" />
              ) : (
                cleared.map((r) => (
                  <article
                    key={r.id}
                    className="rounded-2xl border border-border bg-surface p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{r.itemName} × {r.quantity}</p>
                      <Badge className="bg-moss text-white hover:bg-moss">已清货</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {moduleName(r.moduleId)}
                      {r.clearedAt
                        ? ` · ${new Date(r.clearedAt).toLocaleString("zh-CN")}`
                        : ""}
                    </p>
                  </article>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

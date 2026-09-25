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

type Module = { id: string; name: string; createdAt: string };
type InventoryItem = { id: string; moduleId: string; itemName: string; quantity: number };
type PendingGroup = {
  userId: string;
  order: number;
  userCn: string;
  username: string;
  canFulfill: boolean;
  shortages: { itemName: string; need: number; have: number }[];
  requests: { id: string; itemName: string; quantity: number; order: number }[];
};
type ClearedRequest = {
  id: string;
  userCn: string;
  username: string;
  itemName: string;
  quantity: number;
  order: number;
  clearedAt?: string;
};

export default function ShipperPage() {
  const { user, loading } = useSession("shipper");
  const [modules, setModules] = useState<Module[]>([]);
  const [moduleId, setModuleId] = useState<string>("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [pending, setPending] = useState<PendingGroup[]>([]);
  const [cleared, setCleared] = useState<ClearedRequest[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  const [moduleName, setModuleName] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("1");

  const loadModules = useCallback(async () => {
    const data = await api<{ modules: Module[] }>("/api/modules");
    setModules(data.modules);
    setModuleId((prev) => prev || data.modules[0]?.id || "");
  }, []);

  const loadModuleData = useCallback(async (id: string) => {
    if (!id) {
      setInventory([]);
      setPending([]);
      setCleared([]);
      return;
    }
    setDataLoading(true);
    setPageError(null);
    try {
      const data = await api<{
        inventory: InventoryItem[];
        pending: PendingGroup[];
        cleared: ClearedRequest[];
      }>(`/api/fulfillment?moduleId=${encodeURIComponent(id)}`);
      setInventory(data.inventory);
      setPending(data.pending);
      setCleared(data.cleared);
    } catch (err) {
      setPageError(err instanceof ApiError ? err.message : "加载失败");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadModules().catch((err) =>
      setPageError(err instanceof ApiError ? err.message : "无法加载模块"),
    );
  }, [user, loadModules]);

  useEffect(() => {
    if (!user || !moduleId) return;
    loadModuleData(moduleId);
  }, [user, moduleId, loadModuleData]);

  async function createModule(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await api<{ module: Module }>("/api/modules", {
        method: "POST",
        body: JSON.stringify({ name: moduleName }),
      });
      setModuleName("");
      toast.success(`已创建模块「${data.module.name}」`);
      await loadModules();
      setModuleId(data.module.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "创建失败");
    } finally {
      setBusy(false);
    }
  }

  async function addInventory(e: FormEvent) {
    e.preventDefault();
    if (!moduleId) {
      toast.error("请先选择或创建模块");
      return;
    }
    setBusy(true);
    try {
      await api("/api/inventory", {
        method: "POST",
        body: JSON.stringify({
          moduleId,
          itemName,
          quantity: Number(itemQty),
        }),
      });
      setItemName("");
      setItemQty("1");
      toast.success("库存已更新");
      await loadModuleData(moduleId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function shipUser(userId: string, cn: string) {
    if (!moduleId) return;
    setBusy(true);
    try {
      await api("/api/fulfillment", {
        method: "POST",
        body: JSON.stringify({ moduleId, userId }),
      });
      toast.success(`已发货：${cn}`);
      await loadModuleData(moduleId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "发货失败");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return <LoadingBlock label="正在验证发货方身份…" />;
  }

  const selectedModule = modules.find((m) => m.id === moduleId);

  return (
    <div className="min-h-full flex-1">
      <AppHeader title="发货方工作台 · 库存与排发" user={user} />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {pageError && <ErrorBanner message={pageError} />}

        <section className="rise-in rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Label>当前模块（哪一期谷子）</Label>
              {modules.length === 0 ? (
                <p className="text-sm text-muted-foreground">还没有模块，请先创建一期。</p>
              ) : (
                <select
                  className="flex h-9 w-full max-w-md rounded-lg border border-input bg-background px-3 text-sm"
                  value={moduleId}
                  onChange={(e) => setModuleId(e.target.value)}
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <form
              onSubmit={createModule}
              className="flex w-full flex-col gap-2 sm:flex-row sm:items-end lg:w-auto"
              onKeyDown={(e) => {
                if (e.key === "Enter" && ((e.nativeEvent as KeyboardEvent).isComposing || e.keyCode === 229)) {
                  e.preventDefault();
                }
              }}
            >
              <div className="space-y-2 sm:min-w-56">
                <Label htmlFor="moduleName">新建模块</Label>
                <Input
                  id="moduleName"
                  placeholder="例如：第3期"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={busy}>
                创建
              </Button>
            </form>
          </div>
        </section>

        {!moduleId ? (
          <EmptyState title="暂无模块" description="创建一期谷子模块后，即可录入库存并处理排发。" />
        ) : dataLoading ? (
          <LoadingBlock />
        ) : (
          <Tabs defaultValue="inventory" className="rise-in-delay">
            <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
              <TabsTrigger value="inventory">库存</TabsTrigger>
              <TabsTrigger value="pending">待排发</TabsTrigger>
              <TabsTrigger value="cleared">已清货</TabsTrigger>
            </TabsList>

            <TabsContent value="inventory" className="mt-4 space-y-4">
              <form
                onSubmit={addInventory}
                className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-[1fr_120px_auto] sm:items-end"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && ((e.nativeEvent as KeyboardEvent).isComposing || e.keyCode === 229)) {
                    e.preventDefault();
                  }
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="itemName">谷子名</Label>
                  <Input
                    id="itemName"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="例如：立牌 A"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="itemQty">数量</Label>
                  <Input
                    id="itemQty"
                    type="number"
                    min={0}
                    step={1}
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={busy}>
                  保存库存
                </Button>
              </form>

              {inventory.length === 0 ? (
                <EmptyState
                  title={`${selectedModule?.name ?? "本模块"}暂无库存`}
                  description="添加谷子名与数量后，即可对照收货方登记进行排发。"
                />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
                  <table className="w-full min-w-[320px] text-left text-sm">
                    <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">谷子名</th>
                        <th className="px-4 py-3 font-medium">库存数量</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item) => (
                        <tr key={item.id} className="border-b border-border/70 last:border-0">
                          <td className="px-4 py-3 font-medium">{item.itemName}</td>
                          <td className="px-4 py-3 tabular-nums">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pending" className="mt-4 space-y-3">
              {pending.length === 0 ? (
                <EmptyState
                  title="暂无待排发"
                  description="收货方提交登记后，会按排发顺序显示在这里。"
                />
              ) : (
                pending.map((group) => (
                  <article
                    key={group.userId}
                    className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-lg font-semibold text-ink">
                            {group.userCn}
                          </h3>
                          <Badge variant="secondary">顺序 {group.order}</Badge>
                          {group.canFulfill ? (
                            <Badge className="bg-moss text-white hover:bg-moss">可排发</Badge>
                          ) : (
                            <Badge variant="outline">库存不足</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">@{group.username}</p>
                        <ul className="mt-3 space-y-1 text-sm">
                          {group.requests.map((r) => (
                            <li key={r.id}>
                              {r.itemName} × {r.quantity}
                            </li>
                          ))}
                        </ul>
                        {!group.canFulfill && group.shortages.length > 0 && (
                          <p className="mt-2 text-xs text-destructive">
                            缺：
                            {group.shortages
                              .map((s) => `${s.itemName}（需 ${s.need}/有 ${s.have}）`)
                              .join("；")}
                          </p>
                        )}
                      </div>
                      <Button
                        disabled={!group.canFulfill || busy}
                        onClick={() => shipUser(group.userId, group.userCn)}
                      >
                        发货
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </TabsContent>

            <TabsContent value="cleared" className="mt-4">
              {cleared.length === 0 ? (
                <EmptyState title="尚无已清货记录" description="完成发货后，用户本模块下的登记会移到这里。" />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">收货方</th>
                        <th className="px-4 py-3 font-medium">谷子</th>
                        <th className="px-4 py-3 font-medium">数量</th>
                        <th className="px-4 py-3 font-medium">顺序</th>
                        <th className="px-4 py-3 font-medium">清货时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cleared.map((r) => (
                        <tr key={r.id} className="border-b border-border/70 last:border-0">
                          <td className="px-4 py-3">{r.userCn}</td>
                          <td className="px-4 py-3">{r.itemName}</td>
                          <td className="px-4 py-3 tabular-nums">{r.quantity}</td>
                          <td className="px-4 py-3 tabular-nums">{r.order}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {r.clearedAt
                              ? new Date(r.clearedAt).toLocaleString("zh-CN")
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

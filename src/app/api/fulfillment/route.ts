import { requireSession } from "@/lib/auth";
import { handleAuthError, jsonError, jsonOk } from "@/lib/api";
import { aggregateNeeds, buildFulfillmentGroups, deductInventory } from "@/lib/fulfillment";
import { readStore, updateStore } from "@/lib/store";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get("moduleId");
    if (!moduleId) return jsonError("缺少 moduleId");

    const store = await readStore();
    const groups = buildFulfillmentGroups(store.requests, store.inventory, moduleId);
    const receiversById = Object.fromEntries(store.receivers.map((r) => [r.id, r]));
    const pending = groups.map((g) => ({
      ...g,
      userCn: receiversById[g.userId]?.cn ?? "未知",
      username: receiversById[g.userId]?.username ?? "",
    }));

    const cleared = store.requests
      .filter((r) => r.moduleId === moduleId && r.status === "cleared")
      .map((r) => ({
        ...r,
        userCn: receiversById[r.userId]?.cn ?? "未知",
        username: receiversById[r.userId]?.username ?? "",
      }))
      .sort((a, b) => (b.clearedAt || "").localeCompare(a.clearedAt || ""));

    return jsonOk({
      pending,
      cleared,
      inventory: store.inventory.filter((i) => i.moduleId === moduleId),
    });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession("shipper");
    const body = (await request.json()) as { moduleId?: string; userId?: string };
    const moduleId = body.moduleId || "";
    const userId = body.userId || "";
    if (!moduleId || !userId) return jsonError("缺少参数");

    const store = await readStore();
    const groups = buildFulfillmentGroups(store.requests, store.inventory, moduleId);
    const group = groups.find((g) => g.userId === userId);
    if (!group) return jsonError("该用户在本模块下没有待排发登记");
    if (!group.canFulfill) {
      const detail = group.shortages
        .map((s) => `${s.itemName}（需 ${s.need}，库存 ${s.have}）`)
        .join("；");
      return jsonError(`库存不足，不可排发：${detail}`);
    }

    const needs = aggregateNeeds(group.requests);
    const now = new Date().toISOString();

    await updateStore((data) => {
      data.inventory = deductInventory(data.inventory, moduleId, needs);
      for (const r of data.requests) {
        if (r.moduleId === moduleId && r.userId === userId && r.status === "pending") {
          r.status = "cleared";
          r.clearedAt = now;
        }
      }
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleAuthError(err);
  }
}

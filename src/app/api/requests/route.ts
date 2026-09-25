import { requireSession } from "@/lib/auth";
import { handleAuthError, jsonError, jsonOk } from "@/lib/api";
import { readStore, updateStore } from "@/lib/store";
import { randomUUID } from "crypto";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get("moduleId");
    const status = searchParams.get("status");
    const store = await readStore();

    let requests = store.requests;
    if (session.role === "receiver") {
      requests = requests.filter((r) => r.userId === session.id);
    }
    if (moduleId) requests = requests.filter((r) => r.moduleId === moduleId);
    if (status === "pending" || status === "cleared") {
      requests = requests.filter((r) => r.status === status);
    }

    const receiversById = Object.fromEntries(store.receivers.map((r) => [r.id, r]));
    const enriched = requests.map((r) => ({
      ...r,
      userCn: receiversById[r.userId]?.cn ?? "未知",
      username: receiversById[r.userId]?.username ?? "",
    }));

    return jsonOk({ requests: enriched });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession("receiver");
    const body = (await request.json()) as {
      moduleId?: string;
      itemName?: string;
      quantity?: number;
      order?: number;
    };
    const moduleId = body.moduleId || "";
    const itemName = (body.itemName || "").trim();
    const quantity = Number(body.quantity);
    const order = Number(body.order);

    if (!moduleId) return jsonError("请选择哪一期谷子");
    if (!itemName) return jsonError("请填写谷子名");
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      return jsonError("数量须为正整数");
    }
    if (!Number.isFinite(order) || !Number.isInteger(order)) {
      return jsonError("排发顺序须为整数（越小越优先）");
    }

    const store = await readStore();
    if (!store.modules.some((m) => m.id === moduleId)) {
      return jsonError("模块不存在", 404);
    }

    const entry = {
      id: randomUUID(),
      userId: session.id,
      moduleId,
      itemName,
      quantity,
      order,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };
    await updateStore((data) => {
      data.requests.push(entry);
    });
    return jsonOk({ request: entry });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireSession("receiver");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return jsonError("缺少 id");

    await updateStore((data) => {
      const idx = data.requests.findIndex((r) => r.id === id);
      if (idx < 0) throw new Error("登记不存在");
      const target = data.requests[idx];
      if (target.userId !== session.id) throw new Error("FORBIDDEN");
      if (target.status !== "pending") throw new Error("已清货的登记无法删除");
      data.requests.splice(idx, 1);
    });
    return jsonOk({ ok: true });
  } catch (err) {
    return handleAuthError(err);
  }
}

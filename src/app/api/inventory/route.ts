import { requireSession } from "@/lib/auth";
import { handleAuthError, jsonError, jsonOk } from "@/lib/api";
import { readStore, updateStore } from "@/lib/store";
import { randomUUID } from "crypto";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get("moduleId");
    if (!moduleId) return jsonError("缺少 moduleId");
    const store = await readStore();
    const inventory = store.inventory.filter((i) => i.moduleId === moduleId);
    return jsonOk({ inventory });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession("shipper");
    const body = (await request.json()) as {
      moduleId?: string;
      itemName?: string;
      quantity?: number;
    };
    const moduleId = body.moduleId || "";
    const itemName = (body.itemName || "").trim();
    const quantity = Number(body.quantity);
    if (!moduleId) return jsonError("缺少模块");
    if (!itemName) return jsonError("请填写谷子名");
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
      return jsonError("数量须为非负整数");
    }

    const store = await readStore();
    if (!store.modules.some((m) => m.id === moduleId)) {
      return jsonError("模块不存在", 404);
    }

    const existing = store.inventory.find(
      (i) => i.moduleId === moduleId && i.itemName === itemName,
    );

    if (existing) {
      await updateStore((data) => {
        const item = data.inventory.find((i) => i.id === existing.id);
        if (item) item.quantity = quantity;
      });
      return jsonOk({ inventoryItem: { ...existing, quantity } });
    }

    const inventoryItem = {
      id: randomUUID(),
      moduleId,
      itemName,
      quantity,
    };
    await updateStore((data) => {
      data.inventory.push(inventoryItem);
    });
    return jsonOk({ inventoryItem });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireSession("shipper");
    const body = (await request.json()) as {
      id?: string;
      quantity?: number;
      itemName?: string;
    };
    if (!body.id) return jsonError("缺少库存条目");
    const quantity = Number(body.quantity);
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
      return jsonError("数量须为非负整数");
    }

    let updated = null as null | { id: string; moduleId: string; itemName: string; quantity: number };
    await updateStore((data) => {
      const item = data.inventory.find((i) => i.id === body.id);
      if (!item) throw new Error("库存条目不存在");
      item.quantity = quantity;
      if (body.itemName?.trim()) item.itemName = body.itemName.trim();
      updated = { ...item };
    });
    return jsonOk({ inventoryItem: updated });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireSession("shipper");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return jsonError("缺少 id");
    await updateStore((data) => {
      data.inventory = data.inventory.filter((i) => i.id !== id);
    });
    return jsonOk({ ok: true });
  } catch (err) {
    return handleAuthError(err);
  }
}

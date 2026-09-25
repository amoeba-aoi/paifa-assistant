import { requireSession } from "@/lib/auth";
import { handleAuthError, jsonError, jsonOk } from "@/lib/api";
import { readStore, updateStore } from "@/lib/store";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    await requireSession();
    const store = await readStore();
    return jsonOk({ modules: store.modules });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession("shipper");
    const body = (await request.json()) as { name?: string };
    const name = (body.name || "").trim();
    if (!name) return jsonError("请填写模块名称（哪一期谷子）");

    const store = await readStore();
    if (store.modules.some((m) => m.name === name)) {
      return jsonError("该期模块已存在");
    }

    const module = {
      id: randomUUID(),
      name,
      createdAt: new Date().toISOString(),
    };
    await updateStore((data) => {
      data.modules.unshift(module);
    });
    return jsonOk({ module });
  } catch (err) {
    return handleAuthError(err);
  }
}

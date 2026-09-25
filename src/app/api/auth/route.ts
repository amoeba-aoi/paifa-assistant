import { clearSession, isShipperNickname, setSession, shipperSession } from "@/lib/auth";
import { handleAuthError, jsonError, jsonOk } from "@/lib/api";
import { readStore, updateStore } from "@/lib/store";
import { randomUUID } from "crypto";

function normalizeNickname(raw: string | undefined): string {
  return (raw || "").trim();
}

function findReceiverByNickname(
  receivers: { id: string; username: string; cn: string }[],
  nickname: string,
) {
  const n = nickname.toLowerCase();
  return receivers.find(
    (r) => r.username.toLowerCase() === n || r.cn.toLowerCase() === n,
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      mode?: "login" | "register" | "logout";
      nickname?: string;
      /** @deprecated use nickname */
      username?: string;
      cn?: string;
    };

    if (body.mode === "logout") {
      await clearSession();
      return jsonOk({ ok: true });
    }

    const nickname = normalizeNickname(body.nickname || body.username || body.cn);
    if (!nickname) {
      return jsonError("请填写昵称");
    }

    if (body.mode === "register") {
      if (isShipperNickname(nickname)) {
        return jsonError("该昵称为发货方保留，请直接登录");
      }
      const store = await readStore();
      if (findReceiverByNickname(store.receivers, nickname)) {
        return jsonError("该昵称已存在，请直接登录");
      }
      const user = {
        id: randomUUID(),
        username: nickname,
        cn: nickname,
        createdAt: new Date().toISOString(),
      };
      await updateStore((data) => {
        data.receivers.push(user);
      });
      const session = {
        id: user.id,
        role: "receiver" as const,
        username: user.username,
        cn: user.cn,
      };
      await setSession(session);
      return jsonOk({ user: session });
    }

    // login — auto-detect shipper by nickname, else receiver
    if (isShipperNickname(nickname)) {
      const user = shipperSession();
      await setSession(user);
      return jsonOk({ user });
    }

    const store = await readStore();
    const receiver = findReceiverByNickname(store.receivers, nickname);
    if (!receiver) {
      return jsonError("昵称不存在，请先注册", 401);
    }
    const user = {
      id: receiver.id,
      role: "receiver" as const,
      username: receiver.username,
      cn: receiver.cn,
    };
    await setSession(user);
    return jsonOk({ user });
  } catch (err) {
    return handleAuthError(err);
  }
}

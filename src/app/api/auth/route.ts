import { clearSession, isShipperNickname, setSession, shipperSession } from "@/lib/auth";
import { handleAuthError, jsonError, jsonOk } from "@/lib/api";
import { readStore, updateStore } from "@/lib/store";
import { randomUUID } from "crypto";

function normalizeNickname(raw: string | undefined): string {
  return (raw || "").trim().normalize("NFC");
}

function findReceiverByNickname(
  receivers: { id: string; username: string; cn: string }[],
  nickname: string,
) {
  const n = nickname.toLowerCase();
  return receivers.find(
    (r) =>
      r.username.normalize("NFC").toLowerCase() === n ||
      r.cn.normalize("NFC").toLowerCase() === n,
  );
}

async function createReceiver(nickname: string) {
  const user = {
    id: randomUUID(),
    username: nickname,
    cn: nickname,
    createdAt: new Date().toISOString(),
  };
  await updateStore((data) => {
    data.receivers.push(user);
  });
  return {
    id: user.id,
    role: "receiver" as const,
    username: user.username,
    cn: user.cn,
  };
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

    // Shipper known nickname → shipper session
    if (isShipperNickname(nickname)) {
      const user = shipperSession();
      await setSession(user);
      return jsonOk({ user });
    }

    // Existing receiver → log in; unknown nickname → auto-register then log in
    const store = await readStore();
    const existing = findReceiverByNickname(store.receivers, nickname);
    const user = existing
      ? {
          id: existing.id,
          role: "receiver" as const,
          username: existing.username,
          cn: existing.cn,
        }
      : await createReceiver(nickname);

    await setSession(user);
    return jsonOk({ user, created: !existing });
  } catch (err) {
    return handleAuthError(err);
  }
}

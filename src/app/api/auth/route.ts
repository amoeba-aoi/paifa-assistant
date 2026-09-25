import { clearSession, getShipperCredentials, hashPassword, setSession, shipperSession, verifyPassword } from "@/lib/auth";
import { handleAuthError, jsonError, jsonOk } from "@/lib/api";
import { readStore, updateStore } from "@/lib/store";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      mode?: "login" | "register" | "logout";
      role?: "shipper" | "receiver";
      username?: string;
      password?: string;
      cn?: string;
    };

    if (body.mode === "logout") {
      await clearSession();
      return jsonOk({ ok: true });
    }

    const username = (body.username || "").trim();
    const password = body.password || "";
    if (!username || !password) {
      return jsonError("请填写用户名和密码");
    }

    if (body.mode === "register") {
      const cn = (body.cn || "").trim();
      if (!cn) return jsonError("请填写中文名");
      const shipper = getShipperCredentials();
      if (username.toLowerCase() === shipper.username.toLowerCase()) {
        return jsonError("该用户名不可用");
      }
      const store = await readStore();
      if (store.receivers.some((r) => r.username.toLowerCase() === username.toLowerCase())) {
        return jsonError("用户名已存在");
      }
      const passwordHash = await hashPassword(password);
      const user = {
        id: randomUUID(),
        username,
        cn,
        passwordHash,
        createdAt: new Date().toISOString(),
      };
      await updateStore((data) => {
        data.receivers.push(user);
      });
      await setSession({
        id: user.id,
        role: "receiver",
        username: user.username,
        cn: user.cn,
      });
      return jsonOk({
        user: { id: user.id, role: "receiver" as const, username: user.username, cn: user.cn },
      });
    }

    // login
    if (body.role === "shipper") {
      const creds = getShipperCredentials();
      if (username !== creds.username || password !== creds.password) {
        return jsonError("发货方账号或密码错误", 401);
      }
      const user = shipperSession();
      await setSession(user);
      return jsonOk({ user });
    }

    const store = await readStore();
    const receiver = store.receivers.find(
      (r) => r.username.toLowerCase() === username.toLowerCase(),
    );
    if (!receiver || !(await verifyPassword(password, receiver.passwordHash))) {
      return jsonError("用户名或密码错误", 401);
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

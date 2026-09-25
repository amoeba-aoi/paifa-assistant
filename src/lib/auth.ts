import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import type { Role, SessionUser } from "./types";

const SESSION_COOKIE = "paifa_session";

/** Known 发货方 nicknames (no password). */
export function getShipperIdentity() {
  const nickname = (process.env.SHIPPER_NICKNAME || process.env.SHIPPER_USERNAME || "shipper").trim();
  const cn = (process.env.SHIPPER_CN || "发货方").trim();
  return { nickname, cn };
}

export function isShipperNickname(nickname: string): boolean {
  const { nickname: shipperNick, cn } = getShipperIdentity();
  const n = nickname.trim().normalize("NFC").toLowerCase();
  return (
    n === shipperNick.trim().normalize("NFC").toLowerCase() ||
    n === cn.trim().normalize("NFC").toLowerCase()
  );
}

function sessionSecret() {
  return process.env.SESSION_SECRET || "paifa-local-dev-secret-change-me";
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function encodeSession(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionUser;
  } catch {
    return null;
  }
}

export async function setSession(user: SessionUser): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  return decodeSession(jar.get(SESSION_COOKIE)?.value);
}

export async function requireSession(role?: Role): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  if (role && session.role !== role) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export function shipperSession(): SessionUser {
  const { nickname, cn } = getShipperIdentity();
  return {
    id: "shipper",
    role: "shipper",
    username: nickname,
    cn,
  };
}

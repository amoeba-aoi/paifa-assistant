import { promises as fs } from "fs";
import path from "path";
import type { StoreData } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const emptyStore = (): StoreData => ({
  receivers: [],
  modules: [],
  inventory: [],
  requests: [],
});

function normalizeStore(parsed: Partial<StoreData> | null | undefined): StoreData {
  return {
    receivers: (parsed?.receivers ?? []).map((r) => ({
      id: r.id,
      username: r.username,
      cn: r.cn,
      createdAt: r.createdAt,
    })),
    modules: parsed?.modules ?? [],
    inventory: parsed?.inventory ?? [],
    requests: parsed?.requests ?? [],
  };
}

let writeQueue: Promise<void> = Promise.resolve();

function backend(): "gist" | "file" {
  if (process.env.STORE_GIST_ID && (process.env.STORE_GITHUB_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN)) {
    return "gist";
  }
  return "file";
}

function gistToken(): string {
  return (
    process.env.STORE_GITHUB_TOKEN ||
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    ""
  );
}

async function ensureFileStore(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(emptyStore(), null, 2), "utf8");
  }
}

async function readFileStore(): Promise<StoreData> {
  await ensureFileStore();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  try {
    return normalizeStore(JSON.parse(raw) as StoreData);
  } catch {
    return emptyStore();
  }
}

async function writeFileStore(data: StoreData): Promise<void> {
  await ensureFileStore();
  const payload = JSON.stringify(data, null, 2);
  writeQueue = writeQueue.then(async () => {
    await fs.writeFile(STORE_PATH, payload, "utf8");
  });
  await writeQueue;
}

async function readGistStore(): Promise<StoreData> {
  const id = process.env.STORE_GIST_ID!;
  const token = gistToken();
  const res = await fetch(`https://api.github.com/gists/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`读取远程数据失败（gist ${res.status}）`);
  }
  const gist = (await res.json()) as {
    files?: Record<string, { content?: string }>;
  };
  const content = gist.files?.["store.json"]?.content;
  if (!content) return emptyStore();
  try {
    return normalizeStore(JSON.parse(content) as StoreData);
  } catch {
    return emptyStore();
  }
}

async function writeGistStore(data: StoreData): Promise<void> {
  const id = process.env.STORE_GIST_ID!;
  const token = gistToken();
  const payload = JSON.stringify(data, null, 2);
  writeQueue = writeQueue.then(async () => {
    const res = await fetch(`https://api.github.com/gists/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        files: {
          "store.json": { content: payload },
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`写入远程数据失败（gist ${res.status}）：${text.slice(0, 200)}`);
    }
  });
  await writeQueue;
}

export async function readStore(): Promise<StoreData> {
  if (backend() === "gist") return readGistStore();
  return readFileStore();
}

export async function writeStore(data: StoreData): Promise<void> {
  if (backend() === "gist") {
    await writeGistStore(data);
    return;
  }
  await writeFileStore(data);
}

export async function updateStore(
  mutator: (data: StoreData) => void | StoreData,
): Promise<StoreData> {
  const data = await readStore();
  const result = mutator(data);
  const next = result ?? data;
  await writeStore(next);
  return next;
}

export function getStoreBackend(): string {
  return backend();
}

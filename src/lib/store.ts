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

let writeQueue: Promise<void> = Promise.resolve();

async function ensureStore(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(emptyStore(), null, 2), "utf8");
  }
}

export async function readStore(): Promise<StoreData> {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as StoreData;
    return {
      receivers: parsed.receivers ?? [],
      modules: parsed.modules ?? [],
      inventory: parsed.inventory ?? [],
      requests: parsed.requests ?? [],
    };
  } catch {
    return emptyStore();
  }
}

export async function writeStore(data: StoreData): Promise<void> {
  await ensureStore();
  const payload = JSON.stringify(data, null, 2);
  writeQueue = writeQueue.then(async () => {
    await fs.writeFile(STORE_PATH, payload, "utf8");
  });
  await writeQueue;
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

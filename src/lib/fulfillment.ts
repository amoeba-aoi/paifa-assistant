import type { DistributionRequest, InventoryItem } from "./types";

export interface UserFulfillmentGroup {
  userId: string;
  order: number;
  requests: DistributionRequest[];
  canFulfill: boolean;
  shortages: { itemName: string; need: number; have: number }[];
}

/** Aggregate needed qty per item for a set of requests. */
export function aggregateNeeds(requests: DistributionRequest[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of requests) {
    map.set(r.itemName, (map.get(r.itemName) ?? 0) + r.quantity);
  }
  return map;
}

export function stockMap(inventory: InventoryItem[], moduleId: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of inventory.filter((i) => i.moduleId === moduleId)) {
    map.set(item.itemName, (map.get(item.itemName) ?? 0) + item.quantity);
  }
  return map;
}

/**
 * Group pending requests by user, sorted by 排发顺序 ascending.
 * canFulfill uses current stock (does not reserve for earlier pending users).
 */
export function buildFulfillmentGroups(
  requests: DistributionRequest[],
  inventory: InventoryItem[],
  moduleId: string,
): UserFulfillmentGroup[] {
  const pending = requests.filter((r) => r.moduleId === moduleId && r.status === "pending");
  const byUser = new Map<string, DistributionRequest[]>();
  for (const r of pending) {
    const list = byUser.get(r.userId) ?? [];
    list.push(r);
    byUser.set(r.userId, list);
  }

  const groups: UserFulfillmentGroup[] = [];
  for (const [userId, userRequests] of byUser) {
    const order = Math.min(...userRequests.map((r) => r.order));
    groups.push({
      userId,
      order,
      requests: userRequests.sort((a, b) => a.itemName.localeCompare(b.itemName, "zh")),
      canFulfill: false,
      shortages: [],
    });
  }

  groups.sort((a, b) => a.order - b.order || a.userId.localeCompare(b.userId));

  const stock = stockMap(inventory, moduleId);
  for (const group of groups) {
    const needs = aggregateNeeds(group.requests);
    const shortages: UserFulfillmentGroup["shortages"] = [];
    let ok = true;
    for (const [itemName, need] of needs) {
      const have = stock.get(itemName) ?? 0;
      if (have < need) {
        ok = false;
        shortages.push({ itemName, need, have });
      }
    }
    group.canFulfill = ok;
    group.shortages = shortages;
  }

  return groups;
}

export function deductInventory(
  inventory: InventoryItem[],
  moduleId: string,
  needs: Map<string, number>,
): InventoryItem[] {
  const next = inventory.map((i) => ({ ...i }));
  for (const [itemName, need] of needs) {
    let remaining = need;
    for (const item of next) {
      if (item.moduleId !== moduleId || item.itemName !== itemName) continue;
      const take = Math.min(item.quantity, remaining);
      item.quantity -= take;
      remaining -= take;
      if (remaining <= 0) break;
    }
    if (remaining > 0) {
      throw new Error(`库存不足：${itemName}`);
    }
  }
  return next;
}

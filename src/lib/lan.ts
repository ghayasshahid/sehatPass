import "server-only";

import { networkInterfaces } from "os";

import { originForPhone } from "@/lib/format";

function isPrivate(address: string): boolean {
  return (
    address.startsWith("192.168.") ||
    address.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

export function lanIpv4(): string | null {
  const found: { name: string; address: string }[] = [];
  for (const [name, entries] of Object.entries(networkInterfaces())) {
    for (const entry of entries ?? []) {
      const family = String(entry.family);
      if (entry.internal || (family !== "IPv4" && family !== "4")) continue;
      if (!isPrivate(entry.address)) continue;
      found.push({ name, address: entry.address });
    }
  }
  found.sort((a, b) => interfaceRank(a.name) - interfaceRank(b.name));
  return found[0]?.address ?? null;
}

function interfaceRank(name: string): number {
  if (name === "en0") return 0;
  if (name.startsWith("en")) return 1;
  return 2;
}

export function phoneOrigin(origin: string): string {
  return originForPhone(origin, lanIpv4());
}

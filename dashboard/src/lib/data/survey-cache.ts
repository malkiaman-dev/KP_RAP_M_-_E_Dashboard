import fs from "fs";

type CacheEntry<T> = {
  signature: string;
  value: T;
};

const cache = new Map<string, CacheEntry<unknown>>();

export function filesSignature(paths: string[]): string {
  return paths
    .map((filePath) => {
      if (!fs.existsSync(filePath)) return `${filePath}:missing`;
      const stat = fs.statSync(filePath);
      return `${filePath}:${stat.mtimeMs}:${stat.size}`;
    })
    .join("|");
}

export function getCached<T>(
  key: string,
  signature: string,
  loader: () => T
): T {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.signature === signature) {
    return hit.value;
  }

  const value = loader();
  cache.set(key, { signature, value });
  return value;
}

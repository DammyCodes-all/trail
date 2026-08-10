// Cross-platform key/value storage. The extension persists via
// chrome.storage.local (survives, structured-clone values); the web viewer
// falls back to localStorage so caches (share links, AI results) and
// preferences behave identically on both surfaces.
interface StorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

function browserStorage(): StorageArea | undefined {
  const b = (globalThis as Record<string, unknown>).browser as
    | { storage?: { local?: StorageArea } }
    | undefined;
  if (b?.storage?.local) return b.storage.local;
  return undefined;
}

function webStorage(): StorageArea {
  const ls =
    typeof localStorage === "undefined" ? null : (localStorage as Storage);
  return {
    async get(key) {
      if (!ls) return {};
      const raw = ls.getItem(key);
      if (raw === null) return {};
      try {
        return { [key]: JSON.parse(raw) as unknown };
      } catch {
        return {};
      }
    },
    async set(items) {
      if (!ls) return;
      for (const [key, value] of Object.entries(items)) {
        ls.setItem(key, JSON.stringify(value));
      }
    },
  };
}

export function getStorageArea(): StorageArea {
  return browserStorage() ?? webStorage();
}

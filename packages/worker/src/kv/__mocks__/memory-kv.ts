/**
 * Minimal in-memory KVNamespace mock. Covers the subset actually used
 * by the worker: get<T>(key, "json"), put(key, value, { expirationTtl? }).
 */
export function createMemoryKV(): KVNamespace {
  const store = new Map<string, { value: string; expires?: number }>();

  const kv = {
    async get(key: string, type?: string): Promise<unknown> {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expires && Date.now() > entry.expires) {
        store.delete(key);
        return null;
      }
      return type === "json" ? JSON.parse(entry.value) : entry.value;
    },
    async put(
      key: string,
      value: string,
      options?: { expirationTtl?: number },
    ): Promise<void> {
      const expires = options?.expirationTtl
        ? Date.now() + options.expirationTtl * 1000
        : undefined;
      store.set(key, { value, expires });
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
  };

  return kv as unknown as KVNamespace;
}

/** Small process-local read cache. Fresh reads never use completed cached permission snapshots. */
export function createReadCache<T>(ttl: number, now = Date.now, maximum = 256) {
  const values = new Map<string, { value?: T; expires: number; pending?: Promise<T> }>();
  return async (key: string, load: () => Promise<T>, fresh = false): Promise<T> => {
    const previous = values.get(key);
    if (previous?.pending) return structuredClone(await previous.pending);
    if (!fresh && previous?.value !== undefined && previous.expires > now())
      return structuredClone(previous.value);
    for (const [id, entry] of values)
      if (!entry.pending && entry.expires <= now()) values.delete(id);
    if (values.size >= maximum) {
      for (const [id, entry] of values) {
        if (!entry.pending) {
          values.delete(id);
          break;
        }
      }
      if (values.size >= maximum) return structuredClone(await load());
    }
    const entry: { value?: T; expires: number; pending?: Promise<T> } = { expires: 0 };
    // Defer to capture synchronous failures and publish ownership before starting I/O.
    entry.pending = Promise.resolve().then(load);
    values.set(key, entry);
    try {
      const value = await entry.pending;
      entry.value = structuredClone(value);
      entry.expires = now() + ttl;
      delete entry.pending;
      return structuredClone(value);
    } catch (error) {
      if (values.get(key) === entry) values.delete(key);
      throw error;
    }
  };
}

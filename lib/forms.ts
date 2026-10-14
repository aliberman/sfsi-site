// Small FormData readers used by server actions.

export function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optStr(fd: FormData, key: string) {
  return str(fd, key) || null;
}

export function int(fd: FormData, key: string, fallback: number | null = null) {
  const raw = str(fd, key);
  if (raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function bool(fd: FormData, key: string) {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function isoDateOrNull(fd: FormData, key: string) {
  const v = str(fd, key);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export function oneOf<T extends string>(fd: FormData, key: string, allowed: readonly T[], fallback?: T): T {
  const v = str(fd, key) as T;
  if (allowed.includes(v)) return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`Invalid value for ${key}.`);
}

export function uuidOrNull(fd: FormData, key: string) {
  const v = str(fd, key);
  return /^[0-9a-f-]{36}$/i.test(v) ? v : null;
}

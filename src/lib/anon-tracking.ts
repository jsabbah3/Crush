const STORAGE_KEY = "crush_anon_tracked";

export function getAnonTracked(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addAnonTracked(id: string): void {
  const current = getAnonTracked();
  if (!current.includes(id)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, id]));
  }
}

export function removeAnonTracked(id: string): void {
  const current = getAnonTracked();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current.filter((x) => x !== id)));
}

export function clearAnonTracking(): void {
  localStorage.removeItem(STORAGE_KEY);
}

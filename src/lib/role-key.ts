/**
 * One role, however many locations it's posted for: same company, same title
 * (case- and whitespace-insensitive). The inbox folds matches sharing a key
 * into one card, and counts roles by it.
 */
export function roleKey(companyId: string, title: string): string {
  return `${companyId}:${title.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

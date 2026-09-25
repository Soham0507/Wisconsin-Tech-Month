// Minimal CSV builder + browser download helper for admin exports.

function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s: string;
  if (v instanceof Date) s = v.toISOString();
  else if (Array.isArray(v) || (typeof v === "object" && v !== null)) s = JSON.stringify(v);
  else s = String(v);
  // Always quote to keep commas/newlines/quotes safe.
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCSV(rows: Array<Record<string, unknown>>, columns?: string[]): string {
  if (!rows.length && !columns?.length) return "";
  const cols = columns ?? Array.from(rows.reduce<Set<string>>((set, r) => {
    Object.keys(r).forEach((k) => set.add(k));
    return set;
  }, new Set()));
  const header = cols.map(esc).join(",");
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");
  return `${header}\n${body}`;
}

export function downloadCSV(filename: string, csv: string) {
  // Prefix BOM so Excel opens UTF-8 cleanly.
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

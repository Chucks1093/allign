export function log(...args: unknown[]) {
  const line = `[${new Date().toISOString()}] ` + args.map((a) => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" ");
  console.log(line);
}

export function logSeparator(label: string) {
  console.log(`\n========== ${label} — ${new Date().toISOString()} ==========`);
}

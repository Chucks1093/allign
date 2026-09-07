import fs from "fs";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "agent.log");

export function log(...args: unknown[]) {
  const line = `[${new Date().toISOString()}] ` + args.map((a) => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" ");
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

export function logSeparator(label: string) {
  const line = `\n========== ${label} — ${new Date().toISOString()} ==========`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

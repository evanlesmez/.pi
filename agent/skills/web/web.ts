#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const [cmd, arg, limit = "8"]: (string | undefined)[] = process.argv.slice(2);

const decode = (s: string): string =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x?[0-9a-f]+;/gi, "")
   .replace(/&nbsp;/g, " ");

const htmlToText = (html: string): string =>
  decode(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|pre|blockquote)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  ).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();

async function ddgSearch(q: string, n: number): Promise<void> {
  const res = await fetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q), {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await res.text();
  const re = /class="result__a" href="[^"]*uddg=([^&"]+)[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(html)) && i++ < n)
    console.log(`${decodeURIComponent(m[1])}\n  ${htmlToText(m[2])}\n  ${htmlToText(m[3])}\n`);
}

function chromiumFetchPage(url: string): void {
  const html = execFileSync(
    "chromium",
    ["--headless=new", "--disable-gpu", "--no-sandbox", "--virtual-time-budget=5000", "--dump-dom", url],
    { encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"], timeout: 30000 }
  );
  console.log(htmlToText(html));
}

if (cmd === "ddgSearch" && arg) await ddgSearch(arg, +limit!);
else if (cmd === "fetchPage" && arg) chromiumFetchPage(arg);
else console.error("usage: web.ts ddgSearch <query> [limit] | web.ts fetchPage <url>"), process.exit(1);

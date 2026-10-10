#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const [cmd, arg, n]: (string | undefined)[] = process.argv.slice(2);
const PORT = 9222;
const WS_URL = `ws://127.0.0.1:${PORT}/session`;
const PROFILE_DIR = join(
  process.env.LOCALAPPDATA ?? process.env.XDG_DATA_HOME ??
    join(homedir(), ".local", "share"),
  "librewolf-agent",
);
const LAUNCH_ARGS = [
  "--profile",
  PROFILE_DIR,
  "--no-remote",
  "--class",
  "librewolf-agent",
  "--remote-debugging-port",
  String(PORT),
  "--remote-allow-origins",
  `ws://localhost:${PORT}`,
];

const connect = (): Promise<WebSocket | null> =>
  new Promise((r) => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => r(ws);
    ws.onerror = () => r(null);
  });

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

async function librewolfConnect(): Promise<WebSocket> {
  let ws = await connect();
  if (ws) return ws;
  mkdirSync(PROFILE_DIR, { recursive: true });
  spawn("librewolf", LAUNCH_ARGS, { detached: true, stdio: "ignore" })
    .on("error", () => {
      console.error(
        "librewolf not found on PATH. Add its install dir to PATH (Windows: C:\\Program Files\\LibreWolf).",
      );
      process.exit(1);
    })
    .unref();
  for (let i = 0; i < 30 && !ws; i++) {
    await sleep(500);
    ws = await connect();
  }
  if (!ws) throw new Error(`LibreWolf did not open port ${PORT}`);
  return ws;
}

async function librewolfEval(url: string, expression: string): Promise<string> {
  const ws = await librewolfConnect();
  let id = 0;
  const pending = new Map<number, (m: any) => void>();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data as string);
    if (m.id) pending.get(m.id)?.(m);
  };
  const send = (method: string, params: object): Promise<any> =>
    new Promise((r) => {
      ws.send(JSON.stringify({ id: ++id, method, params }));
      pending.set(id, r);
    });
  let session = await send("session.new", { capabilities: {} });
  for (let i = 0; i < 100 && session.type === "error"; i++) {
    await sleep(300);
    session = await send("session.new", { capabilities: {} });
  }
  if (session.type === "error") {
    throw new Error(`BiDi: ${session.message} (restart LibreWolf)`);
  }
  const { result: { context } } = await send("browsingContext.create", {
    type: "tab",
  });
  try {
    await send("browsingContext.navigate", { context, url, wait: "complete" });
    const r = await send("script.evaluate", {
      expression,
      target: { context },
      awaitPromise: false,
    });
    if (r.type === "error" || r.result?.type === "exception") {
      throw new Error(`eval: ${r.message ?? r.result?.exceptionDetails?.text}`);
    }
    return r.result?.result?.value ?? "";
  } finally {
    await send("browsingContext.close", { context });
    await send("session.end", {});
    ws.close();
  }
}

const DDG_EXTRACT =
  `JSON.stringify([...document.querySelectorAll(".result:not(.result--ad)")].map(r => {
  const a = r.querySelector(".result__a");
  return { url: new URL(a?.href ?? "", location.href).searchParams.get("uddg") ?? a?.href ?? "",
           title: a?.innerText ?? "", snippet: r.querySelector(".result__snippet")?.innerText ?? "" };
}))`;

async function ddgSearch(q: string, n: number): Promise<void> {
  const url = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q);
  const results: { url: string; title: string; snippet: string }[] = JSON.parse(
    await librewolfEval(url, DDG_EXTRACT) || "[]",
  );
  if (!results.length) {
    console.error("No results — check the LibreWolf window for a CAPTCHA.");
    process.exit(2);
  }
  results.slice(0, n).forEach((r) =>
    console.log(`${r.url}\n  ${r.title}\n  ${r.snippet}\n`)
  );
}

const PAGE_EXTRACT = `JSON.stringify({
  text: document.body.innerText,
  links: [...new Map([...document.links]
    .filter(a => a.protocol.startsWith("http") && a.innerText.trim())
    .map(a => [a.href.split("#")[0], a.innerText.trim().replace(/\\s+/g, " ")])).entries()]
})`;

async function fetchPage(url: string, max: number): Promise<void> {
  const { text, links }: { text: string; links: [string, string][] } = JSON
    .parse(await librewolfEval(url, PAGE_EXTRACT));
  const body = text.replace(/\n\s*\n+/g, "\n").trim();
  const out = body + "\n\n## Links\n" +
    links.map(([href, label]) => `${href}  ${label}`).join("\n");
  console.log(max && out.length > max ? out.slice(0, max) : out);
  if (body.length < 200) {
    console.error(
      "hint: page nearly empty; it may need login. Ask the user to sign in in the agent LibreWolf window, or try another URL.",
    );
  }
  if (max && out.length > max) {
    console.error(
      `hint: truncated at ${max} of ${out.length} chars; pass a larger max, or 0 for all and pipe through rg.`,
    );
  }
}

if (cmd === "ddgSearch" && arg) await ddgSearch(arg, +(n ?? 8));
else if (cmd === "fetchPage" && arg) await fetchPage(arg, +(n ?? 20000));
else {console.error(
    "usage: web.ts ddgSearch <query> [limit=8] | web.ts fetchPage <url> [max=20000, 0=all]\n" +
      "ddgSearch: url, title, snippet per result\n" +
      "fetchPage: JS-rendered visible text, then '## Links' (url  label)",

  ),
    process.exit(1);}

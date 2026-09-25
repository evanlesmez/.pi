#!/usr/bin/env node
import { spawn } from "node:child_process";

const [cmd, arg, limit = "8"]: (string | undefined)[] = process.argv.slice(2);
const PORT = 9222;
const WS_URL = `ws://127.0.0.1:${PORT}/session`;
const LAUNCH_ARGS = [
  "-P",
  "agent",
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
  spawn("librewolf", LAUNCH_ARGS, { detached: true, stdio: "ignore" }).unref();
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

async function fetchPage(url: string): Promise<void> {
  const text = await librewolfEval(url, "document.body.innerText");
  console.log(text.replace(/\n\s*\n+/g, "\n").trim());
}

if (cmd === "ddgSearch" && arg) await ddgSearch(arg, +limit!);
else if (cmd === "fetchPage" && arg) await fedchPage(arg);
else {console.error(
    "usage: web.ts ddgSearch <query> [limit] | web.ts fetchPage <url>",
  ),
    process.exit(1);}
